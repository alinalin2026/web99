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
import { assertNotRefused, createMessage, DEFAULT_MODEL, messageText, tokenBudget, type Effort } from "./anthropic";

const EXPECTED_CHARS = 38000;
const ROLES = ["hero", "work", "detail"] as const;

export function siteOrigin(): string {
  return (process.env.INSTANT_SITE_ORIGIN ?? "https://web99.ie").replace(/\/+$/, "");
}

export interface LibraryTrade {
  key: string;
  label: string;
  images: { role: string; url: string; alt: string }[];
}

interface ManifestEntry { label: string; alts: Record<string, string> }

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
    if (images.some((i) => i.role === "hero")) trades.push({ key, label: entry.label, images });
  }
  return trades;
}

function libraryMenu(library: LibraryTrade[]): string {
  if (!library.length) return "No photo library is available. Build the page WITHOUT photographs, using bold typography, colour blocks, gradients and CSS patterns.";
  const lines = library.map(
    (t) => `- ${t.key} (${t.label}): ` + t.images.map((i) => `${i.role} = ${i.url} — ${i.alt}`).join(" | ")
  );
  return `IMAGE LIBRARY — the ONLY photographs you may use. Choose the ONE folder whose trade is closest to this business and use only that folder's images (you may reuse an image). If NO folder is a reasonable match, use no photographs and rely on typography, colour blocks, gradients and CSS patterns instead — never use a mismatched trade's photos.\n${lines.join("\n")}`;
}

export function instantSiteInstructions(library: LibraryTrade[]): string {
  return `You are a senior web designer and conversion copywriter at a Dublin studio. Produce ONE complete, self-contained, production-quality HTML document (inline <style> only) for a small business front page that looks like a professional agency designed it — comparable to a premium Framer/Webflow marketing site.

HARD TECHNICAL RULES
- Output ONLY the raw HTML document starting with <!doctype html>. No markdown fences, no commentary.
- NO JavaScript of any kind (no <script>, no event-handler attributes). FAQ uses native <details>/<summary>. Navigation must work without JS: on mobile widths simply hide the text links and keep the logo + one CTA button.
- Load fonts with ONE Google Fonts <link> (display + body pairing). No other external resources. Photos only from the IMAGE LIBRARY below, via <img src> or CSS url().
- LAYOUT CONTAINER: every section's content must sit inside its own <div class="wrap"> element. Never put width, max-width, margin or padding rules on the same element as .wrap, and never give a hero/inner wrapper class a width:100% that could fight it. Full-bleed backgrounds go on the <section>; the text goes in .wrap inside it.
- Fully responsive at 1280px and 390px. Sticky header. No horizontal scroll.

ART DIRECTION
Pick ONE strong direction that fits the trade (Premium Dark, Bold Industrial, Modern Local, Warm Boutique, Minimal Editorial, Classic Professional, Friendly Family…) and commit: a deliberate palette (one dominant + one accent, as CSS custom properties), big confident type, generous spacing, consistent radius and subtle shadows/borders. Real visual hierarchy. Use consistent inline SVG icons. Hero photo goes behind a tinted overlay so text is always readable, but keep the photo clearly visible: use a directional gradient (dark on the text side, at most ~15% tint on the photo side), never a uniform dark wash. Decorative badges, floating cards and shapes must never overlap text or each other — place them in normal flow or leave generous clear space.

SECTIONS (all required, in order)
1. Sticky header: wordmark, nav anchors, primary CTA.  2. Hero: eyebrow, huge headline, supporting paragraph, two CTAs, three qualitative trust chips.  3. Services grid, 6-8 cards with icons (use the "work" and "detail" photos on feature cards or a split band).  4. Value band of 3-4 qualitative benefits.  5. Process, 4-5 numbered steps.  6. About/positioning split section.  7. FAQ, 4 items.  8. Big CTA band + full footer.

${libraryMenu(library)}

FACT RULES (strict)
Write finished, ready-to-ship copy in plain confident Irish-English using the real business name. NEVER invent prices, years in business, staff counts, awards, certifications, insurance, named clients, testimonials, star ratings, project counts, statistics or opening hours, and never invent phone numbers, emails or addresses — use the neutral link text "Get a free quote" pointing to #contact. No placeholder/template language ("lorem", "your text here", "sample", "coming soon"). Only use what the owner said; for anything they did not say, write normal category-level descriptive copy for the trade.`;
}

const GUARD_CSS = `.wrap{box-sizing:border-box!important;width:100%!important;max-width:1200px!important;margin-left:auto!important;margin-right:auto!important;padding-left:clamp(20px,4vw,40px)!important;padding-right:clamp(20px,4vw,40px)!important}img{max-width:100%}`;

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

export interface InstantSiteResult { html: string; ms: number; outputChars: number }

export async function generateInstantSite(
  brief: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<InstantSiteResult> {
  const started = Date.now();
  const effort = (process.env.ANTHROPIC_INSTANT_SITE_EFFORT as Effort | undefined) ?? "low";
  let streamed = "";
  let lastPct = -1;

  const message = await createMessage(
    {
      model: process.env.ANTHROPIC_INSTANT_SITE_MODEL ?? process.env.ANTHROPIC_BUILD_MODEL ?? DEFAULT_MODEL,
      system: instantSiteInstructions(loadLibrary()),
      messages: [{ role: "user", content: `WHAT THE OWNER TOLD US ABOUT THEIR BUSINESS (their own words):\n${brief}` }],
      max_tokens: tokenBudget(30000, effort),
      effort,
    },
    {
      signal,
      onText: (delta) => {
        streamed += delta;
        const pct = Math.min(96, Math.floor((streamed.length / EXPECTED_CHARS) * 100));
        if (pct !== lastPct) { lastPct = pct; onProgress?.(pct); }
      },
    }
  );
  assertNotRefused(message);

  const out = messageText(message) || streamed;
  if (out.length < 4000) throw new Error("Model returned too little output.");
  return { html: finalizeHtml(out), ms: Date.now() - started, outputChars: out.length };
}
