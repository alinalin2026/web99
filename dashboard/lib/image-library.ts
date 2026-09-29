/* ===========================================================================
   IMAGE LIBRARY + INSTANT THEMES
   ---------------------------------------------------------------------------
   Powers the free live preview on /start. Nothing here calls an AI: the
   moment the trade is known the preview can already look like a designed
   website, while the text sections are still being written.

   Two layers of imagery, in order of preference:
     1. PHOTOS   — real photos from the library below, served as static files
                   from the marketing site (src/assets/img/library/<category>/).
                   Drop a photo in and add its path to LIBRARY: it is picked up
                   automatically, no other change needed (see dashboard/README.md).
     2. ART      — a per-trade coloured gradient with a large line glyph. Used
                   whenever a category has no photos yet, so the preview never
                   shows a broken or empty image.

   The paid build does not use this file: it swaps in the customer's own
   photos or generates images (images.ts).
   =========================================================================== */

export type Category =
  | "plumber" | "electrician" | "barber" | "health" | "cafe" | "retail"
  | "florist" | "professional" | "builder" | "cleaner" | "fitness"
  | "photographer" | "mechanic" | "garden" | "general";

export type StyleId = "modern" | "classic" | "bold" | "soft" | "dark";
export const STYLE_IDS: StyleId[] = ["modern", "classic", "bold", "soft", "dark"];

/* Photos per category, first = hero. Paths are served by the static site.
   Empty array = use generated art. */
export const LIBRARY: Record<Category, string[]> = {
  plumber: [],
  electrician: [],
  barber: ["/assets/img/hero-barber.webp"],
  health: [],
  cafe: [],
  retail: [],
  florist: [],
  professional: [],
  builder: [],
  cleaner: [],
  fitness: [],
  photographer: [],
  mechanic: [],
  garden: [],
  general: [],
};

/* --- trade → category ------------------------------------------------------ */

/* Order matters: the more specific trade is tested first ("flower shop" is a
   florist, not retail; "window cleaner" is a cleaner, not a builder). */
const MATCHERS: [Category, RegExp][] = [
  ["florist", /flor|flower|bouquet/],
  ["plumber", /plumb|heating|boiler|drain|gas\s?fit/],
  ["electrician", /electric|sparky|solar|alarm|cctv/],
  ["barber", /barber|hair|salon|beaut|nail|lash|brow|tattoo|\bspa\b|massage|make-?up/],
  ["health", /dent|physio|clinic|chiropract|optic|doctor|therap|counsel|\bvet|pharma|health|osteo|podiat/],
  ["cafe", /caf[eé]|coffee|restaurant|takeaway|\bbar\b|\bpub\b|food|cater|pizza|chipper|bistro|deli|bakery|bake/],
  ["cleaner", /clean|laundr|pressure\s?wash|valet(?!ing)|domestic/],
  ["garden", /garden|landscap|lawn|\btree|hedge|paving|fencing|grounds/],
  ["mechanic", /mechanic|garage|motor|\bcars?\b|tyre|detailing|\bauto|vehicle|\bnct\b/],
  ["builder", /build|construct|roof|carpent|plaster|paint|tiler|joiner|decorat|floor|extension|stone|kitchen fit/],
  ["fitness", /gym|fitness|personal train|yoga|pilates|crossfit|martial|boxing|sport/],
  ["photographer", /photo|video|film|design|creative|studio|music|\bdj\b|event/],
  ["professional", /solicitor|\blaw|account|bookkeep|consult|insur|mortgage|estate agent|architect|financ|\btax|coach|tutor|training/],
  ["retail", /shop|store|boutique|retail|cloth|fashion|jewel|gift/],
];

export function classifyTrade(...parts: (string | undefined | null)[]): Category {
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  for (const [category, re] of MATCHERS) if (re.test(haystack)) return category;
  return "general";
}

export function normaliseStyle(value: unknown): StyleId {
  const v = String(value ?? "").toLowerCase().trim();
  return (STYLE_IDS as string[]).includes(v) ? (v as StyleId) : "modern";
}

/* --- palettes -------------------------------------------------------------- */

const PALETTE: Record<Category, [string, string]> = {
  plumber: ["#0b6fb3", "#06b6d4"],
  electrician: ["#e08a00", "#ff5a1f"],
  barber: ["#1f2937", "#b45309"],
  health: ["#0f9d8a", "#2e8fd8"],
  cafe: ["#8a4b2a", "#d97706"],
  retail: ["#9d174d", "#f59e0b"],
  florist: ["#4d7c5a", "#d9527f"],
  professional: ["#1e3a8a", "#475569"],
  builder: ["#b45309", "#475569"],
  cleaner: ["#0284c7", "#16a34a"],
  fitness: ["#dc2626", "#111827"],
  photographer: ["#111827", "#7c3aed"],
  mechanic: ["#ea580c", "#0f172a"],
  garden: ["#15803d", "#65a30d"],
  general: ["#5b3fe8", "#ec4899"],
};

interface StyleSpec {
  bg: string; card: string; ink: string; muted: string; line: string;
  radius: string; head: string; weight: string; caseCss: string; spacing: string;
}

const SANS = `system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
const STYLES: Record<StyleId, StyleSpec> = {
  modern:  { bg: "#ffffff", card: "#f5f6fa", ink: "#10131a", muted: "#5b6472", line: "#e4e7ee", radius: "14px", head: SANS, weight: "800", caseCss: "none", spacing: "-0.02em" },
  classic: { bg: "#fbf8f2", card: "#ffffff", ink: "#1d1b17", muted: "#6a655a", line: "#e6dfd0", radius: "4px", head: `Georgia,"Times New Roman",serif`, weight: "700", caseCss: "none", spacing: "0" },
  bold:    { bg: "#ffffff", card: "#f1f1f1", ink: "#0b0b0b", muted: "#4d4d4d", line: "#d6d6d6", radius: "0px", head: `"Arial Black","Helvetica Neue",Arial,sans-serif`, weight: "900", caseCss: "uppercase", spacing: "0.01em" },
  soft:    { bg: "#fffaf7", card: "#ffffff", ink: "#2b2530", muted: "#6f6577", line: "#f0e3dc", radius: "26px", head: `"Avenir Next","Nunito",${SANS}`, weight: "700", caseCss: "none", spacing: "-0.01em" },
  dark:    { bg: "#0f1115", card: "#191c23", ink: "#f3f4f6", muted: "#9aa3b2", line: "#262a33", radius: "12px", head: SANS, weight: "800", caseCss: "none", spacing: "-0.02em" },
};

/* --- art glyphs (one simple line drawing per category) ----------------------- */

const GLYPH: Record<Category, string> = {
  plumber: `<path d="M24 6C24 6 12 20 12 29a12 12 0 0 0 24 0C36 20 24 6 24 6z"/>`,
  electrician: `<polygon points="27,4 10,27 22,27 20,44 38,20 26,20"/>`,
  barber: `<circle cx="14" cy="34" r="6"/><circle cx="34" cy="34" r="6"/><path d="M18 30L38 6M30 30L10 6"/>`,
  health: `<path d="M20 6h8v14h14v8H28v14h-8V28H6v-8h14z"/>`,
  cafe: `<path d="M8 18h26v10a12 12 0 0 1-12 12h-2A12 12 0 0 1 8 28z"/><path d="M34 21h4a5 5 0 0 1 0 10h-4"/><path d="M16 6v6M24 6v6"/>`,
  retail: `<path d="M10 16h28l-2 26H12z"/><path d="M17 20v-6a7 7 0 0 1 14 0v6"/>`,
  florist: `<circle cx="24" cy="12" r="7"/><circle cx="24" cy="36" r="7"/><circle cx="12" cy="24" r="7"/><circle cx="36" cy="24" r="7"/><circle cx="24" cy="24" r="5"/>`,
  professional: `<rect x="6" y="15" width="36" height="25" rx="4"/><path d="M17 15v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4M6 26h36"/>`,
  builder: `<path d="M12 10l14-4 4 8-14 4z"/><path d="M22 20L38 42"/>`,
  cleaner: `<path d="M24 4l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"/><path d="M38 34l1.5 4.5L44 40l-4.5 1.5L38 46l-1.5-4.5L32 40l4.5-1.5z"/>`,
  fitness: `<rect x="4" y="18" width="6" height="12" rx="2"/><rect x="10" y="12" width="6" height="24" rx="2"/><rect x="32" y="12" width="6" height="24" rx="2"/><rect x="38" y="18" width="6" height="12" rx="2"/><path d="M16 24h16"/>`,
  photographer: `<rect x="5" y="14" width="38" height="26" rx="5"/><circle cx="24" cy="27" r="8"/><path d="M17 14l3-6h8l3 6"/>`,
  mechanic: `<path d="M6 30l4-10c1-3 3-4 6-4h16c3 0 5 1 6 4l4 10v8H6z"/><circle cx="14" cy="38" r="4"/><circle cx="34" cy="38" r="4"/>`,
  garden: `<path d="M8 40C8 20 20 8 42 6c0 22-12 34-32 34z"/><path d="M8 40L28 20"/>`,
  general: `<circle cx="24" cy="24" r="16"/><path d="M8 24h32M24 8c-8 8-8 24 0 32M24 8c8 8 8 24 0 32"/>`,
};

function glyphUri(category: Category): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' fill='none' stroke='white' ` +
    `stroke-opacity='0.34' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'>` +
    `${GLYPH[category]}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* --- the theme ------------------------------------------------------------- */

export interface PreviewTheme {
  category: Category;
  style: StyleId;
  brand: string;
  /** How many real library photos are in use (0 = generated art only). */
  photoCount: number;
  /** Complete stylesheet for the preview document. Generated here, so the
   *  design lives in one place and the browser just drops it in. */
  css: string;
}

const cssUrl = (u: string) => `url("${u.replace(/["\\]/g, "")}")`;

export function buildTheme(input: {
  businessName: string;
  trade: string;
  description?: string;
  style?: unknown;
}): PreviewTheme {
  const category = classifyTrade(input.trade, input.description, input.businessName);
  const style = normaliseStyle(input.style);
  const [a, b] = PALETTE[category];
  const s = STYLES[style];
  const photos = LIBRARY[category];

  const photoVars = photos
    .slice(0, 4)
    .map((p, i) => `--p${i + 1}:${cssUrl(p)};`)
    .join("");

  const css = `
:root{--accent:${a};--accent2:${b};--bg:${s.bg};--card:${s.card};--ink:${s.ink};--muted:${s.muted};--line:${s.line};
--radius:${s.radius};--font-head:${s.head};--head-weight:${s.weight};--head-case:${s.caseCss};--head-space:${s.spacing};
--glyph:${glyphUri(category)};--hero-photo:${photos[0] ? cssUrl(photos[0]) : "none"};${photoVars}}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font:16px/1.55 ${SANS};-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--font-head);font-weight:var(--head-weight);text-transform:var(--head-case);letter-spacing:var(--head-space);line-height:1.1;margin:0}
p{margin:0}
.w99-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 22px;background:var(--bg);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.w99-nav b{font-family:var(--font-head);font-weight:var(--head-weight);font-size:1.05rem;letter-spacing:var(--head-space)}
.w99-nav i{width:9px;height:9px;border-radius:50%;background:var(--accent);display:inline-block;margin-left:6px;opacity:.9}
.slot{opacity:1}
.slot.in{animation:rise .5s ease both}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
/* The hero slot IS the hero image: it shows art/photo the instant the theme
   arrives, while the words are still being written. */
#s-hero{min-height:300px;display:flex;align-items:flex-end;color:#fff;
background:linear-gradient(180deg,rgba(6,8,20,.18),rgba(6,8,20,.62)),var(--hero-photo) center/cover no-repeat,var(--glyph) 90% 45%/36% no-repeat,linear-gradient(135deg,var(--accent),var(--accent2))}
#s-hero:empty::before{content:"";display:block;width:56%;height:16px;margin:0 22px 40px;border-radius:99px;background:rgba(255,255,255,.35);box-shadow:0 -34px 0 0 rgba(255,255,255,.35),0 -68px 0 6px rgba(255,255,255,.22);animation:pulse 1.3s ease-in-out infinite}
.w99-hero{padding:56px 22px 30px;max-width:640px}
.w99-hero h1{font-size:clamp(1.9rem,6.5vw,2.9rem);margin-bottom:12px}
.w99-sub{font-size:1.08rem;opacity:.95;margin-bottom:22px}
.w99-cta{margin-top:6px}
.w99-cta button,.w99-hero button{font:inherit;font-weight:700;border:0;padding:13px 24px;border-radius:calc(var(--radius) + 8px);background:#fff;color:var(--accent);cursor:default}
.w99-contact .w99-cta button{background:var(--accent);color:#fff}
#s-services,#s-trust,#s-contact{padding:44px 22px}
#s-services:empty,#s-trust:empty,#s-contact:empty{min-height:170px;background:linear-gradient(90deg,var(--card) 25%,var(--line) 37%,var(--card) 63%);background-size:400% 100%;animation:shimmer 1.4s ease infinite;margin:22px;border-radius:var(--radius)}
@keyframes shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}
.w99-services h2,.w99-trust h2,.w99-contact h2{font-size:clamp(1.4rem,4.6vw,2rem);margin-bottom:20px}
.w99-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.w99-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px 12px 20px}
.w99-card::before{content:"";display:block;height:128px;border-radius:calc(var(--radius) - 3px);margin-bottom:14px;
background:var(--photo,none) center/cover no-repeat,var(--glyph) center/36% no-repeat,linear-gradient(var(--ang,135deg),var(--accent),var(--accent2))}
.w99-card:nth-child(1){--photo:var(--p2);--ang:135deg}
.w99-card:nth-child(2){--photo:var(--p3);--ang:200deg}
.w99-card:nth-child(3){--photo:var(--p4);--ang:70deg}
.w99-card:nth-child(4){--ang:250deg}
.w99-card h3{font-size:1.1rem;margin:0 8px 6px}
.w99-card p{color:var(--muted);font-size:.95rem;margin:0 8px}
#s-trust{background:var(--card);border-block:1px solid var(--line)}
.w99-trust p{color:var(--muted);max-width:60ch;margin-bottom:16px}
.w99-points{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.w99-points li{padding-left:28px;position:relative;font-weight:600}
.w99-points li::before{content:"";position:absolute;left:0;top:.35em;width:14px;height:14px;border-radius:50%;background:var(--accent)}
.w99-contact p{color:var(--muted);margin-bottom:18px}
#s-contact{text-align:center}
footer{padding:22px;text-align:center;color:var(--muted);font-size:.85rem;border-top:1px solid var(--line)}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

  return { category, style, brand: input.businessName, photoCount: photos.length, css };
}
