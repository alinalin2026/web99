/* ===========================================================================
   INSTANT SITE
   ---------------------------------------------------------------------------
   The full-page version of the free pre-payment preview: ONE strong-model call
   writes a complete, art-directed, self-contained front page (as opposed to
   instant-preview.ts, which streams four small unstyled sections).

   Photos come from a pre-generated library (public/library, see manifest.json)
   rather than being generated per request — that keeps images out of the
   latency path and makes their quality a curated, one-off decision. The model
   picks the closest trade folder itself from the menu below, in the same call,
   so there is no separate classification round-trip.

   The output is UNTRUSTED (an owner's free-text description flows into the
   prompt). finalizeHtml() strips scripts/handlers/embeds and injects a strict
   CSP; the browser additionally renders it in a sandboxed, script-less iframe.
   =========================================================================== */

import fs from "node:fs";
import path from "node:path";
import iconData from "./icons.json";
import { paletteById, paletteInstructions, palettes, pickPalette, type Palette } from "./palettes";
import { assertNotRefused, createMessage, DEFAULT_MODEL, messageText, tokenBudget, type Effort } from "./anthropic";

const EXPECTED_CHARS = 38000;
const ROLES = ["hero", "work", "detail"] as const;

export function siteOrigin(): string {
  return (process.env.INSTANT_SITE_ORIGIN ?? "https://web99.ie").replace(/\/+$/, "");
}

export interface LibraryTrade {
  key: string;
  label: string;
  /** Words that, when the owner uses them, point at this folder (label, key and manifest aliases). */
  terms: string[];
  /** A general-purpose folder (offices, tools, people…) used when no trade matches. */
  generic: boolean;
  images: { role: string; url: string; alt: string }[];
}

interface ManifestEntry { label: string; alts: Record<string, string>; aliases?: string[]; generic?: boolean }

const STOP = new Set(["and", "the", "for", "services", "service", "shop", "store", "company", "business", "care", "home", "house"]);
const termsFor = (key: string, entry: ManifestEntry): string[] => {
  const words = `${key.replace(/-/g, " ")} ${entry.label}`.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  return [...new Set([...words, ...(entry.aliases ?? []).map((a) => a.toLowerCase())])];
};

export function loadLibrary(): LibraryTrade[] {
  const dir = path.join(process.cwd(), "public", "library");
  let manifest: Record<string, ManifestEntry>;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  } catch {
    return [];
  }
  const trades: LibraryTrade[] = [];
  for (const [key, entry] of Object.entries(manifest)) {
    if (!/^[a-z0-9-]+$/.test(key)) continue;
    const images = ROLES.filter((role) => fs.existsSync(path.join(dir, key, `${role}.webp`))).map((role) => ({
      role,
      url: `${siteOrigin()}/library/${key}/${role}.webp`,
      alt: entry.alts?.[role] ?? entry.label,
    }));
    if (images.some((i) => i.role === "hero")) trades.push({ key, label: entry.label, terms: termsFor(key, entry), generic: entry.generic === true, images });
  }
  return trades;
}

/** The folders worth showing the model for THIS business: up to three that match the owner's own
 *  words, plus every generic folder as a fallback. Keeps the prompt short as the library grows.
 *  If nothing matches and there are no generic folders, the whole library is offered. */
export function pickLibrary(brief: string, library: LibraryTrade[]): LibraryTrade[] {
  const text = brief.toLowerCase();
  const scored = library
    .filter((t) => !t.generic)
    .map((t) => {
      let score = 0;
      for (const term of t.terms) {
        const stem = term.includes(" ") ? term : term.slice(0, Math.max(Math.min(term.length, 4), Math.ceil(term.length * 0.65)));
        if (new RegExp(`\\b${escapeRe(stem)}`, "i").test(text)) score += term.includes(" ") ? 3 : 2;
      }
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.t);
  const generic = library.filter((t) => t.generic);
  if (!scored.length && !generic.length) return library;
  return [...scored, ...generic];
}

function libraryMenu(library: LibraryTrade[]): string {
  if (!library.length) return "No photo library is available. Build the page WITHOUT photographs, using bold typography, colour blocks, gradients and CSS patterns.";
  const lines = library.map(
    (t) => `- ${t.key} (${t.label}): ` + t.images.map((i) => `${i.role} = ${i.url} — ${i.alt}`).join(" | ")
  );
  return `IMAGE LIBRARY — the ONLY photographs you may use. Choose the ONE folder whose trade is closest to this business and use only that folder's images (you may reuse an image). If no trade folder is a good match, fall back to a generic-* folder — but generic photos are atmosphere only: use the least specific one (generic-outdoors or generic-team beat generic-home/-office/-workshop/-storefront) for the hero and at most ONE split band, and give the service cards icons, not photos. A photograph must genuinely show what the card or section is about; if it doesn't, use an icon or a colour block instead (a living-room photo on a bouncy-castle page, or a cup of tea on a delivery card, is a failure). Never use a mismatched trade's photos, and never leave the page without a hero photograph unless the list below is empty.\n${lines.join("\n")}`;
}


/** What the customer can ask for when they press "Try another version". */
export const STYLES = {
  lighter: { label: "Lighter", brief: "Use a LIGHT theme: white or warm-cream backgrounds, dark text, one fresh accent colour. Airy, generous whitespace, photo-forward." },
  darker: { label: "Darker", brief: "Use a DARK premium theme: near-black or deep navy backgrounds, light text, one vivid accent colour. Photography with strong contrast." },
  bolder: { label: "Bolder", brief: "Go BOLD and high-contrast: oversized condensed headlines, saturated brand-colour blocks, chunky buttons, a confident grid. Colourful, energetic, not corporate." },
  softer: { label: "Softer", brief: "Go SOFT and friendly: warm neutrals, rounded shapes, a gentle pastel or earthy accent, a warm serif or rounded display font." },
  photos: { label: "More photos", brief: "Make it MORE PHOTOGRAPHIC: a full-bleed hero photo, large image bands between sections, photo-led cards. Keep text short and let the pictures work." },
} as const;
export type StyleKey = keyof typeof STYLES;
export const STYLE_KEYS = Object.keys(STYLES) as StyleKey[];

export interface VersionOptions {
  /** Requested direction; when absent on a retry a not-yet-used one is chosen. */
  style?: StyleKey;
  /** Directions the customer has already seen, so the new one is clearly different. */
  seen?: string[];
  /** Palettes already shown, so a new version gets a fresh one. */
  seenPalettes?: string[];
  /** The palette this version must use (chosen from the style; set by generateInstantSite). */
  palette?: Palette;
}

export function nextStyle(seen: string[], requested?: string): StyleKey {
  if (requested && (STYLE_KEYS as string[]).includes(requested)) return requested as StyleKey;
  const fresh = STYLE_KEYS.filter((k) => !seen.includes(k));
  const pool = fresh.length ? fresh : STYLE_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function versionBrief(opts?: VersionOptions): string {
  if (!opts?.style) return "";
  return `\n\nTHIS IS A NEW VERSION — the customer saw an earlier design and asked to try another. ${STYLES[opts.style].brief} It must look CLEARLY different from before: a different palette, different fonts, a different hero layout and different section styling. Same business facts and the same fact rules.${opts.seen?.length ? ` Directions already shown: ${opts.seen.join(", ")}.` : ""}`;
}

export function instantSiteInstructions(library: LibraryTrade[], opts?: VersionOptions): string {
  return `You are a senior web designer and conversion copywriter at a Dublin studio. Produce ONE complete, self-contained, production-quality HTML document (inline <style> only) for a small business front page that looks like a professional agency designed it — comparable to a premium Framer/Webflow marketing site.

HARD TECHNICAL RULES
- Output ONLY the raw HTML document starting with <!doctype html>. No markdown fences, no commentary.
- NO JavaScript of any kind (no <script>, no event-handler attributes). FAQ uses native <details>/<summary>. Navigation must work without JS: on mobile widths simply hide the text links and keep the logo + one CTA button. EVERY link on the page (header, hero buttons, cards, footer) must be an in-page anchor to a section that exists — href="#services", "#process", "#about", "#faq", "#contact" — with those exact ids on the matching <section> elements. Never link to other pages, external sites or "#" placeholders: the whole site is this one page and the customer will click every link.
- Load fonts with the ONE Google Fonts <link> given in the palette. No other external resources. Photos only from the IMAGE LIBRARY below, via <img src> or CSS url().
- LAYOUT CONTAINER: every section's content must sit inside its own <div class="wrap"> element. Never put width, max-width, margin or padding rules on the same element as .wrap, and never give a hero/inner wrapper class a width:100% that could fight it. Full-bleed backgrounds go on the <section>; the text goes in .wrap inside it.
- Fully responsive at 1280px and 390px. Sticky header. No horizontal scroll.

ART DIRECTION
Pick ONE strong direction that fits the trade (Fresh & Light, Modern Local, Warm Boutique, Minimal Editorial, Classic Professional, Friendly Family, Bold Industrial, Premium Dark…) and commit. DEFAULT TO A LIGHT, BRIGHT DESIGN (white or warm backgrounds, dark text, one strong accent) — most small-business customers want to feel welcomed, not spooked; only choose a dark theme where the trade truly suits it (barber, nightlife, luxury, cinema, tattoo). Whatever you pick, the page is PHOTOGRAPHIC: a large real hero photograph and photos on the service cards or split bands — a page with no images is a failure. Commit to the palette below, big confident type, generous spacing, consistent radius and subtle shadows/borders. Real visual hierarchy. HERO LAYOUT: for LIGHT themes prefer a split hero (headline and buttons on the solid page background, the photo in a large rounded frame beside it); otherwise a full-bleed photo with WHITE text over a strong dark gradient on the text side (at most ~15% tint on the photo side, never a uniform dark wash). TEXT CONTRAST IS MANDATORY: any text placed over a photograph must be white on a genuinely dark gradient, and dark text may only sit on a light solid or very light area — never dark text over a dark, tinted or busy photo. Check every text-on-image spot, including hero eyebrow, headline, paragraph, chips and buttons. Decorative badges, floating cards and shapes must never overlap text or each other — place them in normal flow or leave generous clear space.

SECTIONS (all required, in order)
1. Sticky header: wordmark, nav anchors, primary CTA.  2. Hero: eyebrow, huge headline, supporting paragraph, two CTAs, three qualitative trust chips.  3. Services grid (id="services"), 6-8 cards with icons (use the "work" and "detail" photos on feature cards or a split band).  4. Value band of 3-4 qualitative benefits.  5. "How it works" process (id="process"), 4-5 numbered steps.  6. About/positioning split section (id="about").  7. FAQ (id="faq"), 4 items.  8. Big CTA band (id="contact") + full footer. The header nav shows: Services, How it works, About, FAQ, Contact.

${paletteInstructions(opts?.palette)}

ICONS — never draw SVG yourself. Write <i class="ic" data-icon="NAME"></i> and the real icon is inserted for you. NAME must be one of the names below; choose the icon that actually depicts the thing (wrench for repairs, droplet for water, shield-check for insured — never a plus or a circle as a stand-in). Icons use currentColor and are 1.5em by default; give the element your own class or style to change size or colour (e.g. <i class="ic card-icon" data-icon="wrench"></i> with .card-icon{width:28px;height:28px;color:var(--accent)}). Use the same icon style throughout.
${iconMenu()}

${libraryMenu(library)}

FACT RULES (strict)
Write finished, ready-to-ship copy in plain confident Irish-English using the real business name. NEVER invent prices, years in business, staff counts, awards, certifications, insurance, named clients, testimonials, star ratings, project counts, statistics or opening hours, and never invent phone numbers, emails or addresses — use the neutral link text "Get a free quote" pointing to #contact. No placeholder/template language ("lorem", "your text here", "sample", "coming soon"). Only use what the owner said; for anything they did not say, write normal category-level descriptive copy for the trade.${versionBrief(opts)}`;
}

/* --- icons ------------------------------------------------------------------
   The model never draws SVG: it writes <i class="ic" data-icon="wrench"></i> using names from the
   curated list (icons.json, Lucide, ISC licence) and finalizeHtml() swaps in the real inline SVG. */
const ICONS = iconData.icons as Record<string, string>;
const ICON_GROUPS = iconData.groups as Record<string, string[]>;

export function iconMenu(): string {
  return Object.entries(ICON_GROUPS).map(([g, names]) => `${g}: ${names.join(" ")}`).join("\n");
}

const iconSvg = (name: string, extra: string) =>
  `<svg class="ic${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] ?? ICONS.check}</svg>`;

export function inlineIcons(html: string): string {
  return html.replace(/<(i|span)\b([^>]*?)\bdata-icon\s*=\s*["']([a-z0-9-]{1,40})["']([^>]*)>\s*<\/\1\s*>/gi, (_w, _t, before: string, name: string, after: string) => {
    const attrs = `${before} ${after}`;
    const cls = attrs.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const style = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i)?.[1] ?? attrs.match(/\bstyle\s*=\s*'([^']*)'/i)?.[1];
    const extra = cls.split(/\s+/).filter((c) => c && c !== "ic" && /^[\w-]+$/.test(c)).map((c) => ` ${c}`).join("");
    const svg = iconSvg(name, extra);
    return style ? svg.replace("<svg ", `<svg style="${style.replace(/"/g, "&quot;")}" `) : svg;
  });
}

const GUARD_CSS = `:where(.ic){width:1.5em;height:1.5em;flex:none;vertical-align:-0.25em}html{scroll-behavior:smooth}[id]{scroll-margin-top:96px}.wrap{box-sizing:border-box!important;width:100%!important;max-width:1200px!important;margin-left:auto!important;margin-right:auto!important;padding-left:clamp(20px,4vw,40px)!important;padding-right:clamp(20px,4vw,40px)!important}img{max-width:100%}`;

const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The model is told to use ONE trade folder and only files that exist, but a
 *  mismatched or invented photo (a plumber's van on a florist's page) is the
 *  most visible way a preview can look wrong — so this is enforced in code:
 *  the most-used valid trade wins, every other library URL is remapped to the
 *  same role in that trade, and URLs that point at nothing are blanked. */
export function enforceLibrary(html: string, library: LibraryTrade[]): string {
  const re = new RegExp(`${escapeRe(siteOrigin())}/library/([a-z0-9-]+)/([a-z]+)\\.webp`, "g");
  const valid = new Map(library.map((t) => [t.key, new Map(t.images.map((i) => [i.role, i.url]))]));
  const counts = new Map<string, number>();
  for (const m of html.matchAll(re)) if (valid.has(m[1]) && valid.get(m[1])!.has(m[2])) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return html.replace(re, (whole, key: string, role: string) => {
    if (!dominant) return BLANK_GIF;
    if (key === dominant && valid.get(key)!.has(role)) return whole;
    const own = valid.get(dominant)!;
    return own.get(role) ?? own.get("hero") ?? BLANK_GIF;
  });
}


const SECTION_HINTS: [string, RegExp][] = [
  ["contact", /contact|quote|call|book|enquir|get-in|touch|reach|visit|find-us|location/i],
  ["faq", /faq|question|answers/i],
  ["process", /how|process|step|works/i],
  ["about", /about|why|who|story|team|us\b/i],
  ["services", /service|what-we|offer|work|feature|product|menu|treatment|range|pricing|gallery|project/i],
];

/** A preview is shown in a sandbox with no navigation, so every link has to be an
 *  in-page anchor that lands on a real section: a nav item that points nowhere (or at
 *  another "page" the model imagined) would look broken to the customer. */
export function fixNavigation(html: string): string {
  const idsOf = (h: string) => [...h.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  let ids = idsOf(html);

  if (!ids.some((i) => /contact/i.test(i))) {
    const lower = html.toLowerCase();
    const tag = (open: string) => {
      let from = lower.lastIndexOf(open);
      while (from >= 0) {
        const end = html.indexOf(">", from);
        if (end < 0) return false;
        if (!/\sid\s*=/i.test(html.slice(from, end))) {
          html = html.slice(0, end) + ' id="contact"' + html.slice(end);
          return true;
        }
        from = lower.lastIndexOf(open, from - 1);
      }
      return false;
    };
    if (!tag("<section")) tag("<footer");
    ids = idsOf(html);
  }

  const target = (hint: string): string => {
    for (const [key, re] of SECTION_HINTS) {
      if (!re.test(hint)) continue;
      const found = ids.find((i) => (key === "process" ? /process|how|step/i : new RegExp(key, "i")).test(i));
      if (found) return `#${found}`;
    }
    const contact = ids.find((i) => /contact/i.test(i));
    return contact ? `#${contact}` : "#";
  };

  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, (whole, attrs: string, inner: string) => {
    const m = attrs.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim();
    const text = inner.replace(/<[^>]*>/g, " ");
    let next = href;
    if (!m) next = target(text);
    else if (/^(mailto:|tel:)/i.test(href)) next = href;
    else if (href === "#" || href.toLowerCase() === "#top") next = "#";
    else if (href.startsWith("#")) next = ids.includes(href.slice(1)) ? href : target(`${href} ${text}`);
    else next = target(`${href} ${text}`);
    const cleaned = attrs.replace(/\s(?:target|rel|download)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/\shref\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, "");
    return `<a${cleaned} href="${next.replace(/"/g, "&quot;")}">${inner}</a>`;
  });
}

/** Reasons a generated page must NOT be shown to a customer. Empty = fine. A page can be
 *  perfectly sanitised and still be broken (cut off mid-section, unclosed tags, placeholder
 *  text, no content) — this is the last gate before it is saved or served. */
/** Which palette a page was built from: its data-palette id if known, else any palette whose bg and accent both appear. */
export function usedPalette(html: string): Palette | undefined {
  const byId = paletteById(html.match(/data-palette\s*=\s*["']([a-z-]+)["']/i)?.[1]);
  const lower = html.toLowerCase();
  const has = (p: Palette) => lower.includes(p.accent.toLowerCase()) && lower.includes(p.bg.toLowerCase());
  if (byId && has(byId)) return byId;
  return palettes.find(has);
}

export function siteProblems(html: string, opts: { photos?: boolean; palette?: Palette | "any" } = {}): string[] {
  const problems: string[] = [];
  const count = (re: RegExp) => (html.match(re) ?? []).length;
  if (!/<\/html\s*>\s*$/i.test(html.trim())) problems.push("page is cut off (no closing </html>)");
  if (!/<\/body\s*>/i.test(html)) problems.push("no closing </body>");
  for (const tag of ["section", "div", "header", "footer", "nav", "main", "ul", "details"]) {
    const open = count(new RegExp(`<${tag}[\\s>]`, "gi"));
    const close = count(new RegExp(`</${tag}\\s*>`, "gi"));
    if (open !== close) problems.push(`unbalanced <${tag}> (${open} open, ${close} closed)`);
  }
  if (count(/<section[\s>]/gi) < 5) problems.push("fewer than 5 sections");
  if (opts.photos && count(/\/library\/[a-z0-9-]+\/[a-z]+\.webp/gi) < 2) problems.push("page has no real photographs");
  if (opts.palette) {
    const used = usedPalette(html);
    if (opts.palette === "any" ? !used : used?.id !== opts.palette.id) problems.push(opts.palette === "any" ? "no curated palette applied" : `palette ${opts.palette.id} was not applied`);
  }
  if (!/<h1[\s>]/i.test(html)) problems.push("no main headline");
  if (!/<footer[\s>]/i.test(html)) problems.push("no footer");
  if (!/<style[\s>][\s\S]{500,}?<\/style>/i.test(html)) problems.push("no styling");
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  if (text.length < 1500) problems.push("too little text");
  if (/lorem ipsum|your text here|\{\{|\bundefined\b|\bNaN\b|\bTODO\b|\[(?:business|company|your|insert)[^\]]*\]/i.test(text)) problems.push("placeholder text on the page");
  return problems;
}

export function finalizeHtml(raw: string, library: LibraryTrade[] = loadLibrary()): string {
  let html = raw.trim().replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = html.search(/<!doctype html|<html[\s>]/i);
  if (start < 0) throw new Error("Model output was not an HTML document.");
  html = html.slice(start);

  html = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*>/gi, "")
    .replace(/<(iframe|object|embed|frame|frameset|applet|base)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(iframe|object|embed|frame|frameset|applet|base)\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(action|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2')
    .replace(/(["'(])\/library\//g, `$1${siteOrigin()}/library/`);
  html = enforceLibrary(html, library);
  html = inlineIcons(html);
  html = fixNavigation(html);

  if (!/<head[\s>]/i.test(html) || !/<body[\s>]/i.test(html) || html.length < 4000) {
    throw new Error("Model output was not a complete page.");
  }

  const origin = siteOrigin();
  const csp = `default-src 'none'; img-src ${origin} data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'none'`;
  const injected = `<meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="no-referrer">`;
  html = html.replace(/<head([^>]*)>/i, `<head$1>${injected}`);
  html = html.replace(/<\/head>/i, `<style>${GUARD_CSS}</style></head>`);
  return html;
}

export interface InstantSiteResult { html: string; ms: number; outputChars: number; palette: string | null }

const RETRY_ONLY_IF_FASTER_THAN_MS = 70_000;

export async function generateInstantSite(
  brief: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
  version?: VersionOptions
): Promise<InstantSiteResult> {
  const started = Date.now();
  const effort = (process.env.ANTHROPIC_INSTANT_SITE_EFFORT as Effort | undefined) ?? "low";
  let bestPct = -1;
  let lastProblems: string[] = [];
  const offered = pickLibrary(brief, loadLibrary());
  // A new version is forced onto a fresh palette from the requested style; the first build lets the model choose.
  const forced = version?.style ? pickPalette(version.style, version.seenPalettes ?? []) : undefined;
  const versionWithPalette: VersionOptions | undefined = version ? { ...version, palette: forced } : undefined;

  /* One attempt is normally enough. If the result is cut off or fails the quality gate we try
     once more (only when there's time left before the request is aborted) — a customer should
     get a good page or an honest "couldn't build it", never a broken one. */
  for (let attempt = 1; attempt <= 2; attempt++) {
    let streamed = "";
    const message = await createMessage(
      {
        model: process.env.ANTHROPIC_INSTANT_SITE_MODEL ?? process.env.ANTHROPIC_BUILD_MODEL ?? DEFAULT_MODEL,
        system: instantSiteInstructions(offered, versionWithPalette),
        messages: [{ role: "user", content: `WHAT THE OWNER TOLD US ABOUT THEIR BUSINESS (their own words):\n${brief}` }],
        max_tokens: tokenBudget(30000, effort),
        effort,
      },
      {
        signal,
        onText: (delta) => {
          streamed += delta;
          const pct = Math.min(96, Math.floor((streamed.length / EXPECTED_CHARS) * 100));
          if (pct > bestPct) { bestPct = pct; onProgress?.(pct); }
        },
      }
    );
    assertNotRefused(message);

    const out = messageText(message) || streamed;
    if (message.stop_reason === "max_tokens") lastProblems = ["output hit the length limit and was cut off"];
    else if (out.length < 4000) lastProblems = ["model returned too little output"];
    else {
      try {
        const html = finalizeHtml(out);
        lastProblems = siteProblems(html, { photos: offered.some((t) => t.images.length > 0), palette: forced ?? "any" });
        if (!lastProblems.length) return { html, ms: Date.now() - started, outputChars: out.length, palette: usedPalette(html)?.id ?? null };
      } catch (err) {
        lastProblems = [(err as Error).message];
      }
    }
    console.error(`instant-site attempt ${attempt} rejected: ${lastProblems.join("; ")}`);
    if (Date.now() - started > RETRY_ONLY_IF_FASTER_THAN_MS) break;
  }
  throw new Error(`Generated page failed quality checks: ${lastProblems.join("; ")}`);
}
