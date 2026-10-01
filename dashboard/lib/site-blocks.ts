/* Section-template model for generated sites.

   The AI writes only WORDS (SiteContent, a small JSON) and names a photo folder, a palette and icons.
   A separate, tested renderer (site-render.ts) turns content + a SiteDesign into the page. Because the
   copy is stored apart from the design, "Try another version" re-renders the same words in a new
   palette/layout instantly, with no further model call. Everything the model writes is treated as
   untrusted text: it is stripped of markup, length-capped and later HTML-escaped by the renderer. */
import { isIcon } from "./icons";
import { paletteById, pickPalette, type Palette } from "./palettes";

export interface ServiceItem { icon: string; title: string; text: string }
export interface SiteContent {
  brand: { name: string; tagline: string; icon: string };
  photoFolder: string | null;
  palette: string | null;
  hero: { eyebrow: string; headline: string; sub: string; primaryCta: string; secondaryCta: string; chips: { icon: string; text: string }[] };
  services: { eyebrow: string; title: string; intro: string; items: ServiceItem[] };
  values: { title: string; items: ServiceItem[] };
  process: { eyebrow: string; title: string; intro: string; steps: { title: string; text: string }[] };
  about: { eyebrow: string; title: string; paragraphs: string[]; bullets: string[]; cta: string };
  faq: { title: string; items: { q: string; a: string }[] };
  cta: { title: string; text: string; button: string };
  contact: { phone: string | null; email: string | null; address: string | null; hours: string | null };
  footer: { blurb: string };
}

export const VARIANTS = {
  logo: ["badge", "monogram", "tagline", "shield", "hex", "emblem", "arch", "duo", "ring", "stacked", "framed", "swoosh"],
  topbar: ["on", "off"],
  header: ["left", "center"],
  hero: ["split-right", "split-left", "full", "centered", "bold"],
  services: ["cards", "list", "feature", "tiles", "split", "bento"],
  values: ["dark", "accent", "light"],
  process: ["cards", "timeline", "steps"],
  band: ["ticker", "none"],
  about: ["photo-left", "photo-right", "centered"],
  faq: ["accordion", "two-col"],
  cta: ["accent", "dark", "photo"],
  footer: ["simple", "columns"],
  gallery: ["band", "none"],
  order: ["classic", "story", "proof"],
} as const;
export type VariantKey = keyof typeof VARIANTS;
export type Variants = { [K in VariantKey]: (typeof VARIANTS)[K][number] };

export interface SiteDesign { palette: string; variants: Variants; seed: string }

/* Layout choices added after the first release. Older saved designs lack them, so they fall back to the
   original page (no mosaic, original section order). */
export const VARIANT_DEFAULTS: Pick<Variants, "gallery" | "order"> = { gallery: "none", order: "classic" };

/* ---------- validation ---------- */

const PLACEHOLDER = /lorem ipsum|your text here|\{\{|\bundefined\b|\bNaN\b|\bTODO\b|\[(?:business|company|your|insert)[^\]]*\]/i;

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const clean = v.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.replace(/\s+\S*$/, "").replace(/[,;:\-–—]$/, "") || cut;
}
const opt = (v: unknown, max: number): string | null => str(v, max) || null;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

const iconOf = (v: unknown, fallback: string) => (isIcon(v) ? v : fallback);
const FALLBACK_ICONS = ["check", "star", "shield-check", "heart", "clock", "sparkles", "thumbs-up", "award"];

function items(v: unknown, max: number, tMax: number, xMax: number): ServiceItem[] {
  return arr(v)
    .map((raw, i) => {
      const o = obj(raw);
      return { icon: iconOf(o.icon, FALLBACK_ICONS[i % FALLBACK_ICONS.length]), title: str(o.title, tMax), text: str(o.text, xMax) };
    })
    .filter((x) => x.title && x.text)
    .slice(0, max);
}

/** Parse and normalise the model's JSON. Throws (so the caller can retry) if the copy is unusable. */
export function parseSiteContent(raw: string, opts: { folders: string[] }): SiteContent {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model output");
  let j: Record<string, unknown>;
  try { j = obj(JSON.parse(raw.slice(start, end + 1))); } catch { throw new Error("model output was not valid JSON"); }

  const h = obj(j.hero), sv = obj(j.services), va = obj(j.values), pr = obj(j.process), ab = obj(j.about), fq = obj(j.faq), ct = obj(j.cta), co = obj(j.contact);
  const folder = typeof j.photoFolder === "string" && opts.folders.includes(j.photoFolder) ? j.photoFolder : null;

  const content: SiteContent = {
    brand: { name: str(obj(j.brand).name, 60), tagline: str(obj(j.brand).tagline, 90), icon: iconOf(obj(j.brand).icon, "") },
    photoFolder: folder,
    palette: paletteById(str(j.palette, 40)) ? str(j.palette, 40) : null,
    hero: {
      eyebrow: str(h.eyebrow, 60), headline: str(h.headline, 95), sub: str(h.sub, 240),
      primaryCta: str(h.primaryCta, 28) || "Get a free quote", secondaryCta: str(h.secondaryCta, 28) || "See our services",
      chips: arr(h.chips)
        .map((c, i) => (typeof c === "string" ? { icon: FALLBACK_ICONS[i % FALLBACK_ICONS.length], text: str(c, 34) } : { icon: iconOf(obj(c).icon, FALLBACK_ICONS[i % FALLBACK_ICONS.length]), text: str(obj(c).text, 34) }))
        .filter((c) => c.text)
        .slice(0, 3),
    },
    services: { eyebrow: str(sv.eyebrow, 40) || "What we do", title: str(sv.title, 80), intro: str(sv.intro, 200), items: items(sv.items, 8, 42, 175) },
    values: { title: str(va.title, 70), items: items(va.items, 4, 38, 130) },
    process: {
      eyebrow: str(pr.eyebrow, 30) || "How it works", title: str(pr.title, 70), intro: str(pr.intro, 160),
      steps: arr(pr.steps).map((s) => ({ title: str(obj(s).title, 40), text: str(obj(s).text, 140) })).filter((s) => s.title && s.text).slice(0, 5),
    },
    about: {
      eyebrow: str(ab.eyebrow, 30) || "About us", title: str(ab.title, 80),
      paragraphs: arr(ab.paragraphs).map((p) => str(p, 420)).filter(Boolean).slice(0, 3),
      bullets: arr(ab.bullets).map((b) => str(b, 70)).filter(Boolean).slice(0, 4), cta: str(ab.cta, 28),
    },
    faq: { title: str(fq.title, 60) || "Questions, answered", items: arr(fq.items).map((f) => ({ q: str(obj(f).q, 110), a: str(obj(f).a, 340) })).filter((f) => f.q && f.a).slice(0, 5) },
    cta: { title: str(ct.title, 80), text: str(ct.text, 200), button: str(ct.button, 28) || "Get a free quote" },
    contact: { phone: opt(co.phone, 30), email: opt(co.email, 80), address: opt(co.address, 110), hours: opt(co.hours, 90) },
    footer: { blurb: str(obj(j.footer).blurb, 160) },
  };

  const missing: string[] = [];
  if (!content.brand.name) missing.push("brand.name");
  if (!content.hero.headline) missing.push("hero.headline");
  if (!content.hero.sub) missing.push("hero.sub");
  if (content.services.items.length < 3) missing.push("services (need 3+)");
  if (content.values.items.length < 3) missing.push("values (need 3+)");
  if (content.process.steps.length < 3) missing.push("process steps (need 3+)");
  if (!content.about.paragraphs.length) missing.push("about.paragraphs");
  if (content.faq.items.length < 3) missing.push("faq (need 3+)");
  if (!content.cta.title) missing.push("cta.title");
  if (!content.brand.icon) content.brand.icon = content.services.items[0]?.icon ?? "sparkles";
  if (missing.length) throw new Error(`content incomplete: ${missing.join(", ")}`);

  if (PLACEHOLDER.test(JSON.stringify(content))) throw new Error("content contains placeholder text");
  // Contact details must look real; anything else is dropped rather than shown.
  if (content.contact.phone && !/^[+()\d][\d\s()+.-]{6,}$/.test(content.contact.phone)) content.contact.phone = null;
  if (content.contact.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(content.contact.email)) content.contact.email = null;
  return content;
}

/* ---------- design selection ---------- */

function hashSeed(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const BIAS: Record<string, Partial<{ [K in VariantKey]: readonly string[] }>> = {
  photos: { hero: ["full", "split-right", "split-left"], about: ["photo-left", "photo-right"], cta: ["photo", "dark"], gallery: ["band"], services: ["split", "cards", "bento"] },
  bolder: { hero: ["bold", "full", "split-left"], services: ["tiles", "cards"], values: ["accent", "dark"], cta: ["accent", "dark"] },
  softer: { hero: ["centered", "split-right"], services: ["cards", "list"], values: ["light"], cta: ["accent"] },
  darker: { values: ["dark", "light"], cta: ["dark", "photo"] },
  lighter: { values: ["light", "accent"], cta: ["accent", "dark"] },
};

export function chooseVariants(seed: string, o: { style?: string; photos: boolean; avoid?: Variants }): Variants {
  const rnd = hashSeed(seed);
  const bias = (o.style && BIAS[o.style]) || {};
  const pick = <K extends VariantKey>(key: K, allowed?: readonly string[]): Variants[K] => {
    let opts: readonly string[] = VARIANTS[key];
    if (bias[key]) opts = opts.filter((v) => bias[key]!.includes(v));
    if (allowed) opts = opts.filter((v) => allowed.includes(v));
    if (!opts.length) opts = allowed ?? VARIANTS[key];
    const prev = o.avoid?.[key];
    const fresh = opts.filter((v) => v !== prev);
    const pool = fresh.length ? fresh : opts;
    return pool[Math.floor(rnd() * pool.length)] as Variants[K];
  };
  return {
    logo: pick("logo"),
    topbar: pick("topbar"),
    header: pick("header"),
    hero: pick("hero", o.photos ? undefined : ["centered", "bold"]),
    services: pick("services", o.photos ? undefined : ["cards", "list", "feature", "tiles", "bento"]),
    values: pick("values"),
    process: pick("process"),
    band: pick("band"),
    about: pick("about", o.photos ? undefined : ["centered"]),
    faq: pick("faq"),
    cta: pick("cta", o.photos ? undefined : ["accent", "dark"]),
    footer: pick("footer"),
    gallery: pick("gallery", o.photos ? undefined : ["none"]),
    order: pick("order"),
  };
}

/** A design for a build. The first build honours the model's palette choice; later versions follow the requested style. */
export function designFor(
  content: SiteContent,
  o: { style?: string; photos: boolean; seenPalettes?: string[]; avoid?: Variants; seed?: string }
): SiteDesign {
  const seed = o.seed ?? Math.random().toString(36).slice(2);
  let palette: Palette | undefined = o.style ? undefined : paletteById(content.palette);
  if (!palette) palette = pickPalette(o.style ?? "lighter", o.seenPalettes ?? [], hashSeed(seed + "p"));
  return { palette: palette.id, variants: chooseVariants(seed, { style: o.style, photos: o.photos, avoid: o.avoid }), seed };
}
