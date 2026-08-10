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
  visualStyle?: string;
  imagePrompts: StudioImagePrompt[];
}

const STYLE_CATALOG = `
WEB99 VISUAL STYLES
Choose ONE style automatically unless the operator-approved plan clearly asks for another direction.
- Modern Local — clean, trustworthy, strong CTA; ideal for trades and practical local services.
- Premium Dark — charcoal/black, confident typography, restrained premium feel.
- Warm Boutique — softer palette, friendly, human and polished; salons, travel, dance, wellness.
- Bold Industrial — strong type, large imagery, robust layouts; construction, signage, demolition.
- Minimal Editorial — sophisticated whitespace, editorial hierarchy, refined service businesses.
- Classic Professional — established, conservative, clear; legal, accounting and professional services.
- Colourful Creative — expressive branding, energetic compositions, arts and creative businesses.
- Luxury — understated, elegant, premium typography and selective imagery.
- Tech Futuristic — sharp interface language, geometric forms and modern technical feel.
- Friendly Family — rounded, warm, approachable; childcare, tutoring and family services.
- Restaurant Hospitality — atmosphere-first, rich imagery, menu/booking emphasis.
- Ecommerce Product — product-first hierarchy, clear merchandising and buying actions.
- Auto — infer the strongest style from the trade, customer and approved plan. This is the default.
`;

function studioPrompt(): string {
  return `You are the senior creative director and conversion copywriter inside the Web99 Agent. An operator has approved the direction for a small-business WEBSITE PREVIEW. Your job is to create the complete creative package for a premium sales demo that feels like the business already has a professionally designed website.

THIS IS A SALES DEMO, NOT A WIREFRAME
The visitor must feel they are visiting a real finished business website. Never write meta-copy such as "this is where we would say", "your text here", "add your phone number", "sample", "mockup", "placeholder", "template", "website template", or anything that exposes the construction process. Never name the business "Irish Small Business Website" or anything similarly generic when a business name is available.

The demo may use polished, business-type-appropriate descriptive copy to create a complete experience even when the customer's brief is thin. You may infer normal presentation language from the supplied business type (for example explaining what soft-strip demolition involves), but DO NOT invent hard factual claims about this specific company. Never fabricate prices, years in business, staff count, awards, certifications, insurance, named clients, guarantees, exact service areas beyond supplied location, opening hours, real completed projects, or testimonials/reviews.

The goal is emotional: the owner should think "this already feels like my business" and want to keep it. Sell the feel without fabricating verifiable credentials.

${STYLE_CATALOG}

COPY
Write FINISHED website copy ready to ship. Use the actual business name wherever it is known. The first screen must have a real headline, real supporting copy and useful CTA labels — never instructions to the future owner.

Normally provide enough copy for a polished one-page local-business website with:
- hero
- 3-6 service/category cards where the supplied business type supports them
- concise about/positioning section
- a trust/process/value section using safe qualitative language rather than invented proof
- useful FAQ based on the service category
- strong contact/quote CTA
- footer content

If specific service names are supplied, prioritize them. If the customer only supplied a broad trade, you may use NORMAL CATEGORY DESCRIPTIONS to make the demo visually complete, but phrase them as the type of work the site is presenting rather than inventing certifications, prices or proof. Do not fabricate reviews.

Use short mobile-friendly paragraphs, strong headings, button labels and practical calls-to-action. Avoid empty agency phrases like 'trusted partner', 'quality you can count on' and 'we pride ourselves'. The first screen should answer what the business does, where relevant, and what the visitor should do next.

LOGO — MANDATORY
Every preview must visibly have a proper logo. If a genuine customer logo is not explicitly supplied in the brief, imagePrompts MUST include exactly one generated logo asset with key "logo" and kind "logo". The logo prompt should create a simple professional mark/wordmark direction that matches the selected visual style and remains legible at mobile header size. Do not put fake credentials, founding dates or slogans into the logo.

IMAGES — PREMIUM MINIMUM
A normal preview should have 4 generated visual assets total when no real assets are supplied:
1. logo
2. hero image
3. service/action image
4. supporting/trust/atmosphere image

Use 3-5 total generated assets as the normal range, and only exceed that when the page genuinely benefits. There should normally be at least THREE non-logo visual images for a premium demo. Make the images visually coherent as if they were art-directed for the same brand: matching colour temperature, photographic treatment and quality.

Each image prompt must specify subject, composition, framing, light, materials, palette, camera/illustration treatment and exact page use. Generic trade imagery is fine, but it must not pretend to show the actual company's employees, premises, vehicles, branded uniforms, customers or completed jobs unless those things were supplied. Avoid readable text/signage inside photos.

For trade/service businesses, favour believable premium editorial/documentary-style imagery of the WORK CATEGORY rather than generic office desks, abstract gradients or meaningless geometric filler. A demolition business should look like demolition/strip-out work; a salon should look like a salon; a travel company should evoke travel.

Return ONLY JSON:
{
  "copyText": string,
  "positioningNote": string,
  "visualStyle": string,
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

Use short stable keys: logo, hero, service, supporting. Do not return an empty imagePrompts array unless the brief explicitly says all required real brand/logo/photo assets have already been supplied.`;
}

export async function prepareStudio(orderId: string): Promise<StudioResult> {
  const order = await getOrder(orderId);
  if (!order) throw new Error(`No order ${orderId}`);
  if (!order.analysis && !order.plan_text) throw new Error("Make and approve the plan first.");

  await setWorkflow(orderId, "creating", { message: "Web99 Agent is writing the website copy and visual direction" });
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

    let prompts = (result.imagePrompts ?? []).filter((p) => p?.key && p?.prompt).slice(0, 8);

    // Every sales preview needs a logo. If the model somehow omitted it, create
    // a deterministic fallback prompt rather than shipping a generic text header.
    const hasLogo = prompts.some((p) => p.kind === "logo" || p.key.toLowerCase() === "logo");
    if (!hasLogo) {
      prompts = [{
        key: "logo",
        title: `${order.business_name ?? "Business"} logo`,
        kind: "logo",
        size: "1024x1024",
        prompt: `Professional original logo for ${order.business_name ?? "this small business"}, a ${order.trade ?? "local service business"}${order.location ? ` in ${order.location}` : ""}. Match a polished ${result.visualStyle ?? "business-appropriate"} visual style. Simple distinctive mark and clean wordmark treatment, strong silhouette, legible at small mobile-header size, no mockup scene, no fake awards, no founding date, no certification badges, plain uncluttered background.`,
      }, ...prompts].slice(0, 8);
    }

    await sql.begin(async (tx) => {
      await tx`
        UPDATE orders SET studio_copy = ${result.copyText.trim()}, studio_data = ${jsonb({
          positioningNote: result.positioningNote ?? "",
          visualStyle: result.visualStyle ?? "Auto",
        })}, workflow_stage = 'studio_ready', failure_reason = NULL
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
      message: `${order.business_name ?? "Website"} creative direction and ${prompts.length} visual asset${prompts.length === 1 ? "" : "s"} are ready`,
      images: prompts.length,
      visualStyle: result.visualStyle ?? "Auto",
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
