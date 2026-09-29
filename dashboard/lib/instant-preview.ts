/* ===========================================================================
   INSTANT PREVIEW (the four-section teaser)
   ---------------------------------------------------------------------------
   Fills the wait on /start while the full-page site (instant-site.ts) is being
   written: hero / services / trust / contact, each its own small OpenAI call,
   all in parallel, streamed to the browser as they finish. Never touches an
   order row and never throws — a failed section is swapped for a plain
   fallback so one bad call can't blank the preview.
   =========================================================================== */

import { MODELS, text } from "./ai";

export interface InstantBrief {
  businessName: string;
  trade: string;
  description: string;
  location?: string;
  /** The customer's conversation language, e.g. "Spanish". Defaults to English. */
  language?: string;
}

export type SectionId = "hero" | "services" | "trust" | "contact";

export interface PreviewEvent { id: SectionId; html: string }

const RULES = `Write for a single small-business homepage section for an Irish business. Plain confident Irish-English, short sentences. No markdown, no code fences, no <html>/<head>/<body>/<style>/<script> tags — return ONLY the inner HTML fragment for this one section, using semantic tags (h1/h2/p/ul/li/button) and the CSS classes named in the instructions, nothing else. No <img> tags and no links: imagery is handled separately.

Never write template/placeholder language ("your text here", "sample", "add your phone", "template", "coming soon"). Never invent prices, years in business, staff counts, awards, certifications, named clients, testimonials, star ratings, phone numbers, addresses or exact opening hours unless they were supplied. You may use normal category-level descriptive language for the trade (e.g. what soft-strip demolition involves) to make it feel complete.`;

function sectionPrompt(id: SectionId, brief: InstantBrief): { system: string; user: string } {
  const language = brief.language?.trim() || "English";
  const context = `BUSINESS: ${brief.businessName}\nTRADE: ${brief.trade}\nLOCATION: ${brief.location ?? "Ireland"}\nDESCRIPTION FROM OWNER: ${brief.description}\nWRITE IN: ${language}`;
  const lang = `Write all visible text in ${language}.`;

  switch (id) {
    case "hero":
      return {
        system: `${RULES}\n${lang}\n\nSECTION: hero. Wrap in <section class="w99-hero">. Include: an <h1> with the business name or a strong headline naming what they do, a one-sentence <p class="w99-sub"> value line, and a <div class="w99-cta"><button>...</button></div> with one primary action label (e.g. "Get a quote", "Call us", "Book now" — pick what fits the trade).`,
        user: context,
      };
    case "services":
      return {
        system: `${RULES}\n${lang}\n\nSECTION: services. Wrap in <section class="w99-services"><h2>...</h2><div class="w99-grid">...cards...</div></section>. Produce exactly 3 <div class="w99-card"><h3>...</h3><p>...</p></div> cards for the specific services this trade offers, using the owner's description where it names services, otherwise normal category services. Each <p> is one short sentence.`,
        user: context,
      };
    case "trust":
      return {
        system: `${RULES}\n${lang}\n\nSECTION: trust/about. Wrap in <section class="w99-trust"><h2>...</h2><p>...</p><ul class="w99-points">...</ul></section>. Write a short, honest positioning paragraph (what makes them worth choosing, in qualitative terms only — no fake credentials) plus 3 short <li> trust points (e.g. local, responsive, straightforward pricing on request — only qualitative claims).`,
        user: context,
      };
    case "contact":
      return {
        system: `${RULES}\n${lang}\n\nSECTION: contact/footer. Wrap in <section class="w99-contact"><h2>...</h2><p>...</p><div class="w99-cta"><button>...</button></div></section>. Short closing pitch and one final call-to-action button matching the hero's action.`,
        user: context,
      };
  }
}

const SECTION_ORDER: SectionId[] = ["hero", "services", "trust", "contact"];

/** Model output is untrusted (the owner's own words feed the prompt). The
 *  browser also renders it in a script-less sandboxed iframe and re-cleans it;
 *  this is the first of those layers. */
export function cleanFragment(html: string): string {
  return html
    .replace(/```[a-z]*\n?|```/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|svg|video|audio)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, "")
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|svg|video|audio|link|meta|base|img|source|picture)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src|action|formaction)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "")
    .trim();
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Fires all sections in parallel; emits each the
 *  instant it resolves, in whatever order they actually finish (not
 *  SECTION_ORDER) — that out-of-order arrival is what makes the assembly feel
 *  alive. Never throws: a failed section is swapped for a minimal fallback so
 *  one bad call can't blank the whole preview. */
export async function runInstantPreview(
  brief: InstantBrief,
  emit: (event: PreviewEvent) => void
): Promise<void> {
  await Promise.all(
    SECTION_ORDER.map(async (id) => {
      let html: string;
      try {
        const { system, user } = sectionPrompt(id, brief);
        html = cleanFragment(await text(system, user, MODELS.sarah, 900, undefined, "minimal"));
        if (!html) html = fallback(id, brief);
      } catch {
        html = fallback(id, brief);
      }
      emit({ id, html });
    })
  );
}

function fallback(id: SectionId, brief: InstantBrief): string {
  const name = esc(brief.businessName);
  const trade = esc(brief.trade);
  const place = esc(brief.location ?? "Ireland");
  switch (id) {
    case "hero":
      return `<section class="w99-hero"><h1>${name}</h1><p class="w99-sub">${trade} in ${place}</p><div class="w99-cta"><button>Get in touch</button></div></section>`;
    case "services":
      return `<section class="w99-services"><h2>What we do</h2><div class="w99-grid"><div class="w99-card"><h3>${trade}</h3><p>Get in touch to talk through what you need.</p></div><div class="w99-card"><h3>Straight answers</h3><p>Clear advice before any work starts.</p></div><div class="w99-card"><h3>Local and reliable</h3><p>Serving ${place} and the surrounding area.</p></div></div></section>`;
    case "trust":
      return `<section class="w99-trust"><h2>Why ${name}</h2><p>Local, straightforward, easy to reach.</p></section>`;
    case "contact":
      return `<section class="w99-contact"><h2>Ready when you are</h2><div class="w99-cta"><button>Contact us</button></div></section>`;
  }
}
