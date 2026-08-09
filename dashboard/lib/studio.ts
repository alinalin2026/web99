import { json, MODELS } from "./ai";
import { getOrder, jsonb, listAssets, logEvent, setWorkflow, sql } from "./db";
import { generateProjectAsset } from "./images";

interface StudioImagePrompt {
  key: string;
  title: string;
  kind: "logo" | "photo" | "illustration";
  size?: "1024x1024" | "1536x1024" | "1024x1536";
  prompt: string;
}

interface StudioResult {
  copyText: string;
  positioningNote: string;
  imagePrompts: StudioImagePrompt[];
}

function studioPrompt(): string {
  return `You are the senior creative director and conversion copywriter inside the Web99 Agent. An operator has approved the strategy for a real small-business website. Turn it into the actual creative package the website builder will use.

You are allowed to improve presentation, hierarchy, clarity, persuasion, wording and emphasis. Find truthful points the owner under-sold and use them well. You are NOT allowed to invent a business fact. Never fabricate prices, services, reviews, years, guarantees, awards, staff, customers, locations, qualifications or claims.

COPY
Write finished website copy, ready to paste into the build. Use clear page and section headings in copyText so the build agent understands the intended structure. Write short mobile-friendly paragraphs, strong truthful headings, button labels and practical contact calls-to-action. Avoid empty agency phrases like 'trusted partner', 'quality you can count on' and 'we pride ourselves'. The first screen should answer what the business does, where relevant, and what the visitor should do next.

IMAGES
Create only the visual assets the demo actually needs, normally 2-7. Include a logo concept only if a useful real logo was not supplied. Each prompt must be specific enough to send straight to an image model: subject, composition, framing, light, materials, palette, camera/illustration treatment and how the asset is used on the page. Do not generate fake documentary evidence of the real company. Generic trade imagery may be illustrative, but must not pretend to be their actual premises, team, customers, vehicles, signage or completed jobs. Avoid text inside photos. Logo prompts may request a symbol/mark.

Return ONLY JSON:
{
  "copyText": string,
  "positioningNote": string,
  "imagePrompts": [
    {
      "key": string,
      "title": string,
      "kind": "logo" | "photo" | "illustration",
      "size": "1024x1024" | "1536x1024" | "1024x1536",
      "prompt": string
    }
  ]
}

Use short stable keys like logo, hero, service-1. imagePrompts can be empty if real supplied imagery makes generation unnecessary.`;
}

export async function prepareStudio(orderId: string): Promise<StudioResult> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (!order.analysis && !order.plan_text) throw new Error("Make and approve the plan first.");

  await setWorkflow(orderId, "creating", { message: "Web99 Agent is writing the website copy and image plan" });
  try {
    const result = await json<StudioResult>(
      studioPrompt(),
      `CUSTOMER BRIEF\n${JSON.stringify(order.brief ?? {}, null, 2)}\n\n` +
        `STRATEGY ANALYSIS\n${JSON.stringify(order.analysis ?? {}, null, 2)}\n\n` +
        `OPERATOR-APPROVED PLAN\n${order.plan_text ?? JSON.stringify(order.analysis ?? {}, null, 2)}`,
      MODELS.studio,
      18000
    );
    if (!result.copyText?.trim()) throw new Error("Web99 Agent returned no website copy.");

    const prompts = (result.imagePrompts ?? []).filter((p) => p?.key && p?.prompt).slice(0, 8);
    await sql.begin(async (tx) => {
      await tx`
        UPDATE orders SET studio_copy = ${result.copyText.trim()}, studio_data = ${jsonb({ positioningNote: result.positioningNote ?? "" })},
          workflow_stage = 'studio_ready', failure_reason = NULL
        WHERE id = ${orderId}`;
      await tx`DELETE FROM project_assets WHERE order_id = ${orderId}`;
      for (let i = 0; i < prompts.length; i++) {
        const p = prompts[i];
        await tx`
          INSERT INTO project_assets (order_id, asset_key, title, kind, size, prompt, sort_order)
          VALUES (${orderId}, ${p.key}, ${p.title || p.key}, ${p.kind || "photo"}, ${p.size ?? null}, ${p.prompt}, ${i})`;
      }
    });
    await logEvent(orderId, "studio_ready", {
      message: `${order.business_name ?? "Website"} copy and ${prompts.length} image prompt${prompts.length === 1 ? "" : "s"} are ready`,
      images: prompts.length,
      provider: "openai",
      model: MODELS.studio,
    });
    return { ...result, imagePrompts: prompts };
  } catch (err) {
    const message = (err as Error).message;
    await sql`UPDATE orders SET workflow_stage = 'failed', failure_reason = ${message} WHERE id = ${orderId}`;
    await logEvent(orderId, "error", { step: "studio", message });
    throw err;
  }
}

export async function generateAllProjectAssets(orderId: string): Promise<void> {
  const assets = await listAssets(orderId);
  const pending = assets.filter((asset) => asset.status !== "ready");

  // Keep image requests separate, but run two at a time so Assisted/Full Auto
  // does not spend several minutes waiting on a single serial request chain.
  let cursor = 0;
  const workerCount = Math.min(2, pending.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < pending.length) {
      const asset = pending[cursor++];
      await generateProjectAsset(orderId, asset.id);
    }
  }));

  await logEvent(orderId, "images_ready", {
    message: `${assets.length} visual asset${assets.length === 1 ? "" : "s"} ready for the build`,
    count: assets.length,
    provider: "openai",
  });
}
