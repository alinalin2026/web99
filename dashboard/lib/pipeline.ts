import { json, MODELS } from "./ai";
import { analystPrompt } from "./prompts/analyst";
import {
  generatorPrompt,
  previewBanner,
  previewCloser,
} from "./prompts/generator";
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

/* ===========================================================================
   THE PIPELINE

     ready → analysing → generating → review → [HUMAN] → live → sent

   The human gate between `generating` and `live` is deliberate and load
   bearing. Everything before it is reversible and private; everything after
   it is a real business's public website. Nothing crosses that line without
   somebody clicking approve.
   =========================================================================== */

const PREVIEW_DOMAIN = process.env.PREVIEW_DOMAIN ?? "web99.ie";
const PREVIEW_DAYS = Number(process.env.PREVIEW_EXPIRY_DAYS ?? 30);

/* --- step one: the analyst ------------------------------------------------ */

export async function analyse(orderId: string): Promise<void> {
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
        `Here is what was extracted from it:\n${JSON.stringify(order.brief, null, 2)}`,
      MODELS.analyst,
      6000
    );

    await sql`UPDATE orders SET analysis = ${jsonb(analysis)} WHERE id = ${orderId}`;
    await logEvent(orderId, "model_call", { step: "analyst", model: MODELS.analyst });

    await generate(orderId);
  } catch (err) {
    await fail(orderId, `Analyst failed: ${(err as Error).message}`);
  }
}

/* --- step two: the generator ---------------------------------------------- */

export async function generate(orderId: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (!order.analysis) throw new Error("Cannot generate before analysis");

  await setState(orderId, "generating");

  try {
    const result = await json<{
      files: Record<string, string>;
      domainSuggestions?: string[];
      notes?: string;
    }>(
      generatorPrompt(),
      `Build brief:\n${JSON.stringify(order.analysis, null, 2)}`,
      MODELS.generator,
      16000
    );

    if (!result.files || !result.files["index.html"]) {
      throw new Error("Generator returned no index.html");
    }

    const problems = validate(result.files);
    if (problems.length) {
      /* Not fatal — the reviewer sees these flagged in the dashboard and
         decides. Better a human judges a borderline site than a regex does. */
      await logEvent(orderId, "error", { step: "validate", problems });
    }

    const slug = await uniqueSlug(
      slugify(order.business_name ?? "site", order.location ?? "")
    );

    await sql`
      UPDATE orders SET
        generated = ${jsonb(result.files)},
        generator_notes = ${result.notes ?? null},
        slug = ${slug},
        preview_url = ${`https://${slug}.${PREVIEW_DOMAIN}`}
      WHERE id = ${orderId}`;

    await logEvent(orderId, "model_call", {
      step: "generator",
      model: MODELS.generator,
      files: Object.keys(result.files),
      domainSuggestions: result.domainSuggestions ?? [],
      problems,
    });

    /* Stop. A person looks at it now. */
    await setState(orderId, "review", { problems: problems.length });
  } catch (err) {
    await fail(orderId, `Generator failed: ${(err as Error).message}`);
  }
}

/* --- the gate -------------------------------------------------------------
   Called only from the dashboard, only by a person, only from `review`. */

export async function approve(orderId: string, who: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (order.state !== "review") {
    throw new Error(`Cannot approve an order in state "${order.state}"`);
  }
  if (!order.generated || !order.slug) {
    throw new Error("Nothing generated to approve");
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

/** Send it back to be rebuilt, optionally with a steer from the reviewer. */
export async function rebuild(orderId: string, steer?: string): Promise<void> {
  if (steer) {
    const order = await getOrder(orderId);
    const analysis = { ...(order?.analysis ?? {}), reviewerNote: steer };
    await sql`UPDATE orders SET analysis = ${jsonb(analysis)} WHERE id = ${orderId}`;
    await logEvent(orderId, "state_change", { step: "rebuild", steer });
  }
  await generate(orderId);
}

async function fail(orderId: string, reason: string): Promise<void> {
  await sql`UPDATE orders SET failure_reason = ${reason} WHERE id = ${orderId}`;
  await logEvent(orderId, "error", { reason });
  await setState(orderId, "failed", { reason });
}

/* --- preview furniture ----------------------------------------------------
   The buy buttons are injected here rather than generated, so they are
   byte-identical on every site and a model can never reword or drop them. */

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

    /* Banner + sticky bar immediately after <body>. */
    html = html.replace(/<body([^>]*)>/i, (m) => `${m}\n${banner}\n`);

    /* Closer before the footer if there is one, otherwise before </body>.
       Homepage only — repeating it on every page is nagging, not selling. */
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

/* --- cheap safety net -----------------------------------------------------
   Catches the failure modes that are both common and mechanically detectable.
   Everything subtle is the reviewer's job — this is not a quality gate, it is
   a list of things worth a second look. */

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

    /* Remote references — the generator is told static and self-contained. */
    if (/<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i.test(content)) {
      problems.push(`${path}: links to an external script or stylesheet.`);
    }
    if (/<img[^>]+src=["']https?:\/\//i.test(content)) {
      problems.push(`${path}: references a remote image — likely invented.`);
    }

    /* Placeholders that reach production if nobody looks. */
    if (/lorem ipsum|TODO|PLACEHOLDER|\[insert|XXXX/i.test(content)) {
      problems.push(`${path}: contains placeholder text.`);
    }

    /* Invented-credential phrases. The facts rule forbids these unless the
       owner said them, and the reviewer should check any that appear. */
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

    /* Testimonials are forbidden outright. */
    if (/<blockquote|testimonial|"\s*[A-Z][a-z]+\s+said/i.test(content)) {
      problems.push(`${path}: looks like it contains a testimonial or quote.`);
    }
  }

  return problems;
}
