import { json, MODELS } from "./ai";
import { analystPrompt } from "./prompts/analyst";
import { previewBanner, previewCloser } from "./prompts/generator";
import {
  sql,
  jsonb,
  getOrder,
  setState,
  logEvent,
  slugify,
  uniqueSlug,
} from "./db";
import { pushSite } from "./github";
import {
  buildWebsiteWithOpenAI,
  OPENAI_BUILD_MODEL,
  OPENAI_IMAGE_MODEL,
} from "./openai-builder";

/* ===========================================================================
   THE PIPELINE

   Customer chat (Claude) -> READY LEAD
                             |
                    operator clicks "Make the plan"
                             v
                    Claude creates build plan
                             |
                    operator reviews the plan
                             |
                 clicks "Build + publish preview"
                             v
              GPT-5.6 builds site + GPT Image 2 visuals
                             |
                     pushed to <slug>.web99.ie
                             v
                            live

   The important approval boundary is now the BUILD PLAN. Nothing expensive is
   generated and nothing is published until an operator has read Claude's plan
   and explicitly clicks the build button.
   =========================================================================== */

const PREVIEW_DOMAIN = process.env.PREVIEW_DOMAIN ?? "web99.ie";
const PREVIEW_DAYS = Number(process.env.PREVIEW_EXPIRY_DAYS ?? 2);

/* --- step one: Claude makes the plan -------------------------------------- */

export async function makePlan(orderId: string, steer?: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);

  await setState(orderId, "analysing");

  try {
    const transcript = order.conversation
      .map((t) => `${t.role === "user" ? "OWNER" : "SARAH"}: ${t.content}`)
      .join("\n\n");

    const analysis = await json<Record<string, unknown>>(
      analystPrompt(),
      `Here is the conversation.\n\n${transcript}\n\n` +
        `Here is what Sarah extracted from it:\n${JSON.stringify(order.brief, null, 2)}` +
        (steer?.trim() ? `\n\nOperator instruction for the plan:\n${steer.trim()}` : ""),
      MODELS.analyst,
      7000
    );

    await sql`
      UPDATE orders
      SET analysis = ${jsonb(analysis)}, failure_reason = NULL
      WHERE id = ${orderId}`;
    await logEvent(orderId, "model_call", {
      step: "plan",
      provider: "anthropic",
      model: MODELS.analyst,
    });
    await setState(orderId, "ready", { plan: true });
  } catch (err) {
    await fail(orderId, `Plan failed: ${(err as Error).message}`);
    throw err;
  }
}

/* Backwards-compatible name for any old imports. It now ONLY makes the plan. */
export async function analyse(orderId: string): Promise<void> {
  return makePlan(orderId);
}

/* --- step two: OpenAI builds the complete site ---------------------------- */

export async function generate(orderId: string, steer?: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (!order.analysis) throw new Error("Make the plan before building the website.");

  await setState(orderId, "generating");

  try {
    const result = await buildWebsiteWithOpenAI(
      order.analysis as Record<string, unknown>,
      steer
    );

    const problems = validate(result.files);
    if (problems.length) {
      await logEvent(orderId, "error", { step: "validate", problems });
    }

    const slug =
      order.slug ??
      (await uniqueSlug(slugify(order.business_name ?? "site", order.location ?? "")));

    await sql`
      UPDATE orders SET
        generated = ${jsonb(result.files)},
        generator_notes = ${result.notes ?? null},
        slug = ${slug},
        preview_url = ${`https://${slug}.${PREVIEW_DOMAIN}`},
        failure_reason = NULL
      WHERE id = ${orderId}`;

    await logEvent(orderId, "model_call", {
      step: "website_build",
      provider: "openai",
      model: OPENAI_BUILD_MODEL,
      imageModel: OPENAI_IMAGE_MODEL,
      files: Object.keys(result.files),
      images: (result.imageRequests ?? []).map((i) => i.id),
      domainSuggestions: result.domainSuggestions ?? [],
      problems,
    });

    /* This transient state keeps approve() as the one function that performs
       the external GitHub write and injects the Web99 preview furniture. */
    await setState(orderId, "review", { problems: problems.length });
  } catch (err) {
    await fail(orderId, `Website build failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * The operator has approved Claude's plan. From this point the requested job is
 * explicit: OpenAI builds the complete site, generates its visual assets, then
 * the result is pushed to the preview subdomain in one flow.
 */
export async function buildAndPublish(
  orderId: string,
  who: string,
  steer?: string
): Promise<void> {
  await generate(orderId, steer);
  const fresh = await getOrder(orderId);
  if (fresh?.state !== "review") {
    throw new Error(`Build did not reach review state (now ${fresh?.state ?? "missing"}).`);
  }
  await approve(orderId, who);
}

/* --- publish preview ------------------------------------------------------ */

export async function approve(orderId: string, who: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (order.state !== "review") {
    throw new Error(`Cannot publish an order in state "${order.state}"`);
  }
  if (!order.generated || !order.slug) {
    throw new Error("Nothing generated to publish");
  }

  const checkoutUrl = `${process.env.APP_URL}/buy/${orderId}`;
  const files = withPreviewFurniture(order.generated, {
    checkoutUrl,
    businessName: order.business_name ?? "your business",
  });

  const sha = await pushSite(order.slug, files, order.business_name ?? order.slug);

  const expires = new Date(Date.now() + PREVIEW_DAYS * 864e5).toISOString();
  await sql`
    UPDATE orders SET
      commit_sha = ${sha},
      approved_by = ${who},
      approved_at = now(),
      expires_at = ${expires}
    WHERE id = ${orderId}`;

  await logEvent(orderId, "push", { sha, slug: order.slug, by: who });
  await setState(orderId, "live", { sha });
}

/** Rebuild a legacy/review build with an operator steer. */
export async function rebuild(orderId: string, steer?: string): Promise<void> {
  await generate(orderId, steer);
}

async function fail(orderId: string, reason: string): Promise<void> {
  await sql`UPDATE orders SET failure_reason = ${reason} WHERE id = ${orderId}`;
  await logEvent(orderId, "error", { reason });
  await setState(orderId, "failed", { reason });
}

/* --- preview furniture ---------------------------------------------------- */

function withPreviewFurniture(
  files: Record<string, string>,
  opts: { checkoutUrl: string; businessName: string }
): Record<string, string> {
  const out: Record<string, string> = { ...files };
  const banner = previewBanner(opts);
  const closer = previewCloser(opts);

  for (const [path, content] of Object.entries(out)) {
    if (!path.endsWith(".html")) continue;

    let html = content;
    html = html.replace(/<body([^>]*)>/i, (m) => `${m}\n${banner}\n`);

    if (path === "index.html") {
      if (/<footer[\s>]/i.test(html)) {
        html = html.replace(/<footer([\s>])/i, `${closer}\n<footer$1`);
      } else {
        html = html.replace(/<\/body>/i, `${closer}\n</body>`);
      }
    }

    out[path] = html;
  }

  return out;
}

/* --- cheap safety net ----------------------------------------------------- */

export function validate(files: Record<string, string>): string[] {
  const problems: string[] = [];
  const html = Object.entries(files).filter(([p]) => p.endsWith(".html"));

  if (!html.length) problems.push("No HTML files at all.");

  for (const [path, content] of html) {
    if (!/<!doctype html>/i.test(content)) problems.push(`${path}: no doctype.`);
    if (!/<meta[^>]+viewport/i.test(content)) problems.push(`${path}: no viewport meta.`);
    if (!/<title>/i.test(content)) problems.push(`${path}: no <title>.`);

    const h1s = content.match(/<h1[\s>]/gi)?.length ?? 0;
    if (h1s !== 1) problems.push(`${path}: ${h1s} <h1> elements, expected exactly 1.`);

    if (/<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i.test(content)) {
      problems.push(`${path}: links to an external script or stylesheet.`);
    }
    if (/<img[^>]+src=["']https?:\/\//i.test(content)) {
      problems.push(`${path}: references a remote image — likely invented.`);
    }

    if (/lorem ipsum|TODO|PLACEHOLDER|\[insert|XXXX|\{\{W99_IMAGE:/i.test(content)) {
      problems.push(`${path}: contains placeholder text or an unresolved image.`);
    }

    const invented = [
      /\b\d+\+?\s*years?\s+(?:of\s+)?experience/i,
      /award[- ]winning/i,
      /fully insured/i,
      /trusted by (?:hundreds|thousands|over)/i,
      /\b(?:5|five)[- ]star\b/i,
      /family[- ]run since/i,
    ];
    for (const re of invented) {
      if (re.test(content)) {
        problems.push(`${path}: claim matching ${re} — confirm the owner said it.`);
      }
    }

    if (/<blockquote|testimonial|"\s*[A-Z][a-z]+\s+said/i.test(content)) {
      problems.push(`${path}: looks like it contains a testimonial or quote.`);
    }
  }

  return problems;
}
