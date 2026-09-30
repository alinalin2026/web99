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
import { iconMenu, inlineIcons } from "./icons";
export { iconMenu, inlineIcons };
import { paletteById, paletteMenu, palettes, type Palette } from "./palettes";
import { designFor, parseSiteContent, type SiteContent, type SiteDesign, type Variants } from "./site-blocks";
import { renderSite, type RenderPhotos } from "./site-render";
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
  /** Requested direction for a new version. */
  style?: StyleKey;
  /** Palettes already shown, so a new version gets a fresh one. */
  seenPalettes?: string[];
  /** The previous version's layout choices, so the new layout differs. */
  avoid?: Variants;
  /** The words of an earlier version: a new version re-renders these instead of asking the model again. */
  content?: SiteContent;
}

export function nextStyle(seen: string[], requested?: string): StyleKey {
  if (requested && (STYLE_KEYS as string[]).includes(requested)) return requested as StyleKey;
  const fresh = STYLE_KEYS.filter((k) => !seen.includes(k));
  const pool = fresh.length ? fresh : STYLE_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function folderMenu(library: LibraryTrade[]): string {
  if (!library.length) return "(no photo folders available — set photoFolder to null)";
  return library.map((t) => `- ${t.key} (${t.label}): ${t.images.map((i) => i.alt).join(" | ")}`).join("\n");
}

export function contentInstructions(library: LibraryTrade[]): string {
  return `You are a senior conversion copywriter at a Dublin web studio. A small business owner has described their business. Write the WORDS for a professional one-page website, as ONE JSON object — nothing else (no markdown fences, no commentary). The layout, colours and code are handled separately; you only provide copy, an icon per item, a photo folder and a palette.

JSON SHAPE (all strings plain text, no HTML, no emoji):
{
 "brand": { "name": "the real business name", "tagline": "<=8 words describing what they do and where" },
 "photoFolder": "one key from PHOTO FOLDERS below",
 "palette": "one id from PALETTES below",
 "hero": { "eyebrow": "<=5 words, e.g. trade + place", "headline": "<=12 words, benefit-led, specific", "sub": "1-2 sentences (<=35 words)", "primaryCta": "<=4 words", "secondaryCta": "<=4 words", "chips": ["3 short trust points, <=4 words each"] },
 "services": { "eyebrow": "What we do", "title": "<=9 words", "intro": "1 sentence", "items": [ { "icon": "ICON NAME", "title": "<=4 words", "text": "1-2 sentences (<=28 words)" } x 6 to 8 ] },
 "values": { "title": "<=7 words", "items": [ { "icon": "ICON NAME", "title": "<=3 words", "text": "1 sentence (<=20 words)" } x 4 ] },
 "process": { "eyebrow": "How it works", "title": "<=8 words", "intro": "1 sentence", "steps": [ { "title": "<=3 words", "text": "1 sentence (<=20 words)" } x 4 to 5 ] },
 "about": { "eyebrow": "About us", "title": "<=10 words", "paragraphs": ["2 short paragraphs"], "bullets": ["3 short points"], "cta": "<=4 words" },
 "faq": { "title": "<=6 words", "items": [ { "q": "a question customers really ask", "a": "1-3 sentence answer" } x 4 to 5 ] },
 "cta": { "title": "<=10 words", "text": "1 sentence", "button": "<=4 words" },
 "contact": { "phone": null, "email": null, "address": null, "hours": null },
 "footer": { "blurb": "1 short sentence" }
}

ICONS — "icon" must be exactly one of these names; choose the one that actually depicts the thing (wrench for repairs, droplet for water, shield-check for insured — never a stand-in):
${iconMenu()}

PALETTES — pick the id that suits the trade. Prefer [light] or [soft]; use [dark] only where the trade truly suits it (barber, nightlife, luxury, cinema, tattoo); [bold] suits energetic trades:
${paletteMenu()}

PHOTO FOLDERS — pick the ONE folder whose photos genuinely fit this business (the alt text shows what each holds). If none fits, pick a generic-* folder (prefer generic-outdoors or generic-team); use null only if the list is empty:
${folderMenu(library)}

FACT RULES (strict)
Write finished, ready-to-ship copy in plain confident Irish-English using the real business name. NEVER invent prices, years in business, staff counts, awards, certifications, insurance, named clients, testimonials, star ratings, project counts, statistics or opening hours, and never invent phone numbers, emails or addresses. Fill "contact" ONLY with details the owner explicitly gave (otherwise leave null). No placeholder/template language ("lorem", "your text here", "sample", "coming soon"). Only use what the owner said; for anything they did not say, write normal category-level descriptive copy for the trade. Write specific, useful sentences — not filler.`;
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

export interface InstantSiteResult { html: string; ms: number; outputChars: number; palette: string | null; content: SiteContent; design: SiteDesign }

const CONTENT_CHARS = 7000;
const RETRY_ONLY_IF_FASTER_THAN_MS = 70_000;

function photosFor(folder: string | null, library: LibraryTrade[]): RenderPhotos {
  const t = library.find((x) => x.key === folder);
  const out: RenderPhotos = {};
  for (const i of t?.images ?? []) if (i.role === "hero" || i.role === "work" || i.role === "detail") out[i.role] = { url: i.url, alt: i.alt };
  return out;
}

/** Content + design -> finished, sanitised page. Deterministic: no model involved. */
export function buildPage(content: SiteContent, design: SiteDesign, library: LibraryTrade[] = loadLibrary()): string {
  return finalizeHtml(renderSite(content, design, photosFor(content.photoFolder, library)), library);
}

async function writeContent(brief: string, offered: LibraryTrade[], onProgress: ((pct: number) => void) | undefined, signal: AbortSignal | undefined, started: number) {
  const effort = (process.env.ANTHROPIC_INSTANT_SITE_EFFORT as Effort | undefined) ?? "low";
  let bestPct = -1;
  let lastProblem = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    let streamed = "";
    const message = await createMessage(
      {
        model: process.env.ANTHROPIC_INSTANT_SITE_MODEL ?? process.env.ANTHROPIC_BUILD_MODEL ?? DEFAULT_MODEL,
        system: contentInstructions(offered),
        messages: [{ role: "user", content: `WHAT THE OWNER TOLD US ABOUT THEIR BUSINESS (their own words):\n${brief}` }],
        max_tokens: tokenBudget(9000, effort),
        effort,
      },
      {
        signal,
        onText: (delta) => {
          streamed += delta;
          const pct = Math.min(94, Math.floor((streamed.length / CONTENT_CHARS) * 100));
          if (pct > bestPct) { bestPct = pct; onProgress?.(pct); }
        },
      }
    );
    assertNotRefused(message);
    const out = messageText(message) || streamed;
    if (message.stop_reason === "max_tokens") lastProblem = "output hit the length limit and was cut off";
    else {
      try { return { content: parseSiteContent(out, { folders: offered.map((t) => t.key) }), chars: out.length }; }
      catch (err) { lastProblem = (err as Error).message; }
    }
    console.error(`instant-site copy attempt ${attempt} rejected: ${lastProblem}`);
    if (Date.now() - started > RETRY_ONLY_IF_FASTER_THAN_MS) break;
  }
  throw new Error(`Generated copy failed checks: ${lastProblem}`);
}

/** Builds a site. A first build asks the model for the copy; a new version (version.content) only re-renders
 *  the same copy in a fresh palette and layout, so it is instant and costs nothing. */
export async function generateInstantSite(
  brief: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
  version?: VersionOptions
): Promise<InstantSiteResult> {
  const started = Date.now();
  const library = loadLibrary();
  const offered = pickLibrary(brief, library);
  let content = version?.content;
  let chars = 0;
  if (!content) {
    const written = await writeContent(brief, offered, onProgress, signal, started);
    content = written.content;
    chars = written.chars;
  }
  // The photo folder must be one the library really has; fall back to the best match for this brief.
  if (!content.photoFolder || !library.some((t) => t.key === content!.photoFolder)) content = { ...content, photoFolder: offered[0]?.key ?? null };

  const hasPhotos = Object.keys(photosFor(content.photoFolder, library)).length > 0;
  const design = designFor(content, { style: version?.style, photos: hasPhotos, seenPalettes: version?.seenPalettes, avoid: version?.avoid });
  onProgress?.(97);
  const html = buildPage(content, design, library);
  const problems = siteProblems(html, { photos: hasPhotos, palette: paletteById(design.palette) });
  if (problems.length) throw new Error(`Generated page failed quality checks: ${problems.join("; ")}`);
  return { html, ms: Date.now() - started, outputChars: chars, palette: design.palette, content, design };
}
