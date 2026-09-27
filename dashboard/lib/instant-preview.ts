/* ===========================================================================
   INSTANT PREVIEW
   ---------------------------------------------------------------------------
   The free, pre-payment "watch it build" preview. Separate from the real
   pipeline in master-pipeline.ts / openai-builder.ts — this never touches an
   order row, never blocks on images, and never runs the plan-approval gate.
   It exists purely to convert a lead who is watching Sarah in real time.

   Design: the page is broken into independent SECTIONS. Each section is its
   own small, fast OpenAI call. All sections fire in parallel. As each one
   resolves it is handed to onSection() immediately — the caller (the SSE
   route) pushes it to the browser the instant it's ready, so sections land
   out of order and the page visibly assembles itself section by section
   instead of appearing all at once after a wait.

   No images are generated here — see STYLE_PALETTES below for the instant,
   zero-AI visual treatment. Real photos/logo only happen in the paid build
   (studio.ts), which this shares no code path with.
   =========================================================================== */

import { MODELS, text } from "./ai";

export interface InstantBrief {
  businessName: string;
  trade: string;
  description: string;
  location?: string;
}

export type SectionId = "hero" | "services" | "trust" | "contact";

export interface SectionResult {
  id: SectionId;
  html: string;
}

const RULES = `Write for a single small-business homepage section for an Irish business. Plain confident Irish-English, short sentences. No markdown, no code fences, no <html>/<head>/<body> tags — return ONLY the inner HTML fragment for this one section, using semantic tags (h1/h2/p/ul/li/a/button) and the CSS classes named in the instructions, nothing else.

Never write template/placeholder language ("your text here", "sample", "add your phone", "template", "coming soon"). Never invent prices, years in business, staff counts, awards, certifications, named clients, testimonials, star ratings or exact opening hours unless they were supplied. You may use normal category-level descriptive language for the trade (e.g. what soft-strip demolition involves) to make it feel complete.`;

function sectionPrompt(id: SectionId, brief: InstantBrief): { system: string; user: string } {
  const context = `BUSINESS: ${brief.businessName}\nTRADE: ${brief.trade}\nLOCATION: ${brief.location ?? "Ireland"}\nDESCRIPTION FROM OWNER: ${brief.description}`;

  switch (id) {
    case "hero":
      return {
        system: `${RULES}\n\nSECTION: hero. Wrap in <section class="w99-hero">. Include: an <h1> with the business name or a strong headline naming what they do, a one-sentence <p class="w99-sub"> value line, and a <div class="w99-cta"><button>...</button></div> with one primary action label (e.g. "Get a quote", "Book now" — pick what fits the trade).`,
        user: context,
      };
    case "services":
      return {
        system: `${RULES}\n\nSECTION: services. Wrap in <section class="w99-services"><h2>...</h2><div class="w99-grid">...cards...</div></section>. Produce 3 to 4 <div class="w99-card"><h3>...</h3><p>...</p></div> cards for the specific services this trade offers, using the owner's description where it names services, otherwise normal category services.`,
        user: context,
      };
    case "trust":
      return {
        system: `${RULES}\n\nSECTION: trust/about. Wrap in <section class="w99-trust"><h2>...</h2><p>...</p><ul class="w99-points">...</ul></section>. Write a short, honest positioning paragraph (what makes them worth choosing, in qualitative terms only — no fake credentials) plus 3 short <li> trust points (e.g. local, responsive, straightforward pricing on request — only qualitative claims).`,
        user: context,
      };
    case "contact":
      return {
        system: `${RULES}\n\nSECTION: contact/footer. Wrap in <section class="w99-contact"><h2>...</h2><p>...</p><div class="w99-cta"><button>...</button></div></section>. Short closing pitch and one final call-to-action button matching the hero's action.`,
        user: context,
      };
  }
}

const SECTION_ORDER: SectionId[] = ["hero", "services", "trust", "contact"];

/** Fires all sections in parallel; calls onSection the instant each resolves,
 *  in whatever order they actually finish (not SECTION_ORDER) — that
 *  out-of-order arrival is what makes the assembly feel alive rather than
 *  a fixed animation. Never throws: a failed section is swapped for a
 *  minimal fallback fragment so one bad call can't blank the whole preview. */
export async function runInstantPreview(
  brief: InstantBrief,
  onSection: (result: SectionResult) => void
): Promise<void> {
  await Promise.all(
    SECTION_ORDER.map(async (id) => {
      try {
        const { system, user } = sectionPrompt(id, brief);
        const html = await text(system, user, MODELS.sarah, 500);
        onSection({ id, html: html.trim() });
      } catch {
        onSection({ id, html: fallback(id, brief) });
      }
    })
  );
}

function fallback(id: SectionId, brief: InstantBrief): string {
  switch (id) {
    case "hero":
      return `<section class="w99-hero"><h1>${brief.businessName}</h1><p class="w99-sub">${brief.trade} in ${brief.location ?? "Ireland"}</p><div class="w99-cta"><button>Get in touch</button></div></section>`;
    case "services":
      return `<section class="w99-services"><h2>What we do</h2><div class="w99-grid"><div class="w99-card"><h3>${brief.trade}</h3><p>Get in touch to talk through what you need.</p></div></div></section>`;
    case "trust":
      return `<section class="w99-trust"><h2>Why ${brief.businessName}</h2><p>Local, straightforward, easy to reach.</p></section>`;
    case "contact":
      return `<section class="w99-contact"><h2>Ready when you are</h2><div class="w99-cta"><button>Contact us</button></div></section>`;
  }
}
