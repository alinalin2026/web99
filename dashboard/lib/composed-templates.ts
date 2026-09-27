import { readFile } from "node:fs/promises";
import path from "node:path";
import { escapeHtml, buildImageMap, inlineImages, stripStrayDataUriSlash, type DonorImageMap } from "./site-asset-utils";
import { REGISTRY, type DonorTemplate } from "./donor-templates";
import sectionsData from "./donor-sections.json";

/* ===========================================================================
   COMPOSED TEMPLATES
   ---------------------------------------------------------------------------
   Whole-donor reuse (donor-templates.ts) makes a preview recognizable as a
   specific, named business's actual site -- fine for one design, wrong once
   the same design is the ONLY thing a whole trade ever sees. This instead
   mixes pieces from two different donors per preview: one supplies the
   "chrome" (header nav + hero + footer -- the parts that carry a design's
   visual identity), the other supplies the "content" (the services/features
   section -- kept topically matched to the trade, since that part carries
   trade-specific copy a mismatched donor wouldn't make sense for).

   Sections were extracted once, offline, from each donor's real rendered
   page via Playwright (a headless browser was needed -- these are React
   SPAs, so the raw built HTML is just an empty <div id="root">; only the
   post-render DOM has real markup). See donor-sections.json. Re-run the
   extraction script if a donor's design changes.

   No SPA router/base-path concern here unlike donor-templates.ts -- these
   are static section snapshots, not a live bundled app, so there's no
   client-side JS at all.
   =========================================================================== */

interface DonorSections {
  header: string | null;
  hero: string | null;
  content: string | null;
  footer: string | null;
}

const SECTIONS = sectionsData as Record<string, DonorSections>;

const NAME_TOKEN = "__W99_BIZ_NAME__";
const PHONE_TOKEN_PREFIX = "__W99_PHONE_";
const LOGO_TOKEN = "__W99_LOGO__";

export interface TradeComposition {
  /** Sources the services/features section -- kept topically matched to the trade. */
  content: string;
  /** Sources header nav + hero + footer -- the visual identity, deliberately
      a different donor than `content` so no trade reads as "that's just
      [donor]'s site with a new name." */
  chrome: string;
}

interface PreparedDonor {
  imageMap: DonorImageMap;
  fontLinks: string;
}

const preparedCache = new Map<string, Promise<PreparedDonor>>();

async function extractFontLinks(dir: string): Promise<string> {
  const html = await readFile(path.join(dir, "index.html"), "utf8").catch(() => "");
  const links = html.match(/<link[^>]*fonts\.g(?:oogleapis|static)\.com[^>]*>/g) ?? [];
  return links.join("\n");
}

function prepare(t: DonorTemplate): Promise<PreparedDonor> {
  let p = preparedCache.get(t.key);
  if (!p) {
    p = (async () => ({
      imageMap: await buildImageMap(t.dir, t.logoFile),
      fontLinks: await extractFontLinks(t.dir),
    }))();
    preparedCache.set(t.key, p);
  }
  return p;
}

/** These fragments are real browser-serialized outerHTML (Playwright), not
    hand-authored/built markup, so "&" is always rendered as "&amp;" in text
    content -- a raw-ampersand literal like "K&L" would never match. */
function htmlEncode(s: string): string {
  return s.replace(/&/g, "&amp;");
}

/** Tokenizes one extracted section fragment: inlines its donor's images,
    marks its donor's business name/phone for later substitution. Runs once
    per donor per process (cached), same spirit as donor-templates.ts.
    Taglines (the other half of a split logo lockup, e.g. "CONSTRUCTION &
    MAINTENANCE") are only stripped from chrome fragments (header/hero/
    footer) -- a tagline word could plausibly appear in ordinary content
    copy, where it should just stay put. */
async function tokenizeFragment(
  html: string | null,
  t: DonorTemplate,
  prepared: PreparedDonor,
  isChrome: boolean
): Promise<string> {
  if (!html) return "";
  // Own absolute deploy prefix (e.g. "/westprint3d/assets/x.webp") -> bare
  // root-relative, same as donor-templates.ts -- otherwise it's still
  // sitting in front of the substring inlineImages matches and replaces,
  // leaving a corrupt "/westprint3d/data:..." reference behind.
  let out = html.replaceAll(`/${t.key}/`, "/");
  out = inlineImages(out, prepared.imageMap, LOGO_TOKEN);
  out = out.split(htmlEncode(t.businessNameLiteral)).join(NAME_TOKEN);
  for (const fragment of t.nameFragments ?? []) out = out.split(htmlEncode(fragment)).join(NAME_TOKEN);
  if (isChrome) {
    for (const tagline of t.taglineFragments ?? []) out = out.split(htmlEncode(tagline)).join("");
  }
  t.phoneLiterals.forEach((phone, i) => {
    out = out.split(htmlEncode(phone)).join(`${PHONE_TOKEN_PREFIX}${t.key}_${i}__${phone}__`);
  });
  return out;
}

interface TokenizedComposite {
  html: string; // header + hero + content + footer, concatenated
  css: string; // both donors' stylesheets
  fontLinks: string;
}

const compositeCache = new Map<string, Promise<TokenizedComposite>>();

async function buildComposite(comp: TradeComposition): Promise<TokenizedComposite> {
  const contentDonor = REGISTRY[comp.content];
  const chromeDonor = REGISTRY[comp.chrome];
  if (!contentDonor) throw new Error(`Unknown content donor: ${comp.content}`);
  if (!chromeDonor) throw new Error(`Unknown chrome donor: ${comp.chrome}`);

  const [contentPrepared, chromePrepared] = await Promise.all([prepare(contentDonor), prepare(chromeDonor)]);
  const contentSections = SECTIONS[comp.content];
  const chromeSections = SECTIONS[comp.chrome];
  if (!contentSections?.content) throw new Error(`No content section extracted for ${comp.content}`);
  if (!chromeSections?.hero) throw new Error(`No hero section extracted for ${comp.chrome}`);

  const [header, hero, content, footer] = await Promise.all([
    tokenizeFragment(chromeSections.header, chromeDonor, chromePrepared, true),
    tokenizeFragment(chromeSections.hero, chromeDonor, chromePrepared, true),
    tokenizeFragment(contentSections.content, contentDonor, contentPrepared, false),
    tokenizeFragment(chromeSections.footer, chromeDonor, chromePrepared, true),
  ]);

  const [contentCss, chromeCss] = await Promise.all([
    readFile(await findCssFile(contentDonor.dir), "utf8"),
    readFile(await findCssFile(chromeDonor.dir), "utf8"),
  ]);

  return {
    html: header + hero + content + footer,
    css: chromeCss + "\n" + contentCss,
    fontLinks: [chromePrepared.fontLinks, contentPrepared.fontLinks].filter(Boolean).join("\n"),
  };
}

const cssFileCache = new Map<string, Promise<string>>();
async function findCssFile(dir: string): Promise<string> {
  let p = cssFileCache.get(dir);
  if (!p) {
    p = (async () => {
      const { listFiles } = await import("./site-asset-utils");
      const files = await listFiles(dir);
      const css = files.find((f) => f.endsWith(".css"));
      if (!css) throw new Error(`No CSS file found under ${dir}`);
      return path.join(dir, css);
    })();
    cssFileCache.set(dir, p);
  }
  return p;
}

function composite(comp: TradeComposition): Promise<TokenizedComposite> {
  const key = `${comp.content}::${comp.chrome}`;
  let p = compositeCache.get(key);
  if (!p) {
    p = buildComposite(comp);
    compositeCache.set(key, p);
  }
  return p;
}

export interface ComposedRenderVars {
  businessName: string;
  phone?: string;
  logoDataUrl?: string;
}

export async function renderComposedTemplate(
  comp: TradeComposition,
  vars: ComposedRenderVars
): Promise<Record<string, string>> {
  const { html, css, fontLinks } = await composite(comp);
  const chromeDonor = REGISTRY[comp.chrome];

  const phoneTokenRe = new RegExp(`${PHONE_TOKEN_PREFIX}[a-z0-9-]+_\\d+__(.*?)__`, "g");
  const userPhone = vars.phone?.trim();
  const chromePrepared = await prepare(chromeDonor);
  const logo = vars.logoDataUrl || chromePrepared.imageMap.ownLogoDataUri || "";
  const name = escapeHtml(vars.businessName);

  let body = html.replace(phoneTokenRe, (_m, originalPhone: string) => userPhone || originalPhone);
  body = body.split(NAME_TOKEN).join(name);
  body = body.split(LOGO_TOKEN).join(logo);
  body = stripStrayDataUriSlash(body);

  const page = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
${fontLinks}
<style>${css}</style>
</head><body>
${body}
</body></html>`;

  return { "index.html": page };
}
