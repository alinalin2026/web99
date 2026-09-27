import { readFile } from "node:fs/promises";
import path from "node:path";
import { escapeHtml, escapeJsString, listFiles, buildImageMap, inlineImages, stripStrayDataUriSlash } from "./site-asset-utils";

/* ===========================================================================
   DONOR TEMPLATES
   ---------------------------------------------------------------------------
   For trades with a real, already-built site design on this box (Manus-style
   static bundle) -- reuse that whole design for a preview, personalized by
   swapping the business name / logo / phone. Everything else (service
   descriptions, testimonials, imagery) stays as the donor's own copy: a
   placeholder for "here's roughly how it'll look", not a per-customer
   content generator.

   See composed-templates.ts for the section-by-section variant (mixes
   pieces from more than one donor per preview) -- this module still backs
   it, since composed-templates.ts reuses this REGISTRY for each donor's
   business name/phone/logo config.

   File contents are cached in memory per donor key with the business name
   still a token, since the images (base64-inlined) make loading each one
   from disk non-trivial -- only a cheap string replace runs per preview.
   =========================================================================== */

export interface DonorTemplate {
  key: string;
  dir: string; // absolute path to the built dist directory
  businessNameLiteral: string;
  /** Shorter forms of the name used in logo lockups, e.g. K&L Construction's
      header/footer render as two separate text nodes -- "K&L" and
      "CONSTRUCTION & MAINTENANCE" -- with no contiguous "K&L Construction"
      substring anywhere, so businessNameLiteral alone misses it. Applied
      AFTER businessNameLiteral (longest-match-first), everywhere the main
      literal is applied. */
  nameFragments?: string[];
  /** The other half of a split logo lockup -- a tagline/descriptor that's
      wrong for any other trade ("CONSTRUCTION & MAINTENANCE" under a
      plumber's name). Stripped to empty. Composed mode only applies these
      to chrome fragments (header/hero/footer), never to a content section,
      since a tagline word could plausibly appear in ordinary content copy. */
  taglineFragments?: string[];
  phoneLiterals: string[];
  /** Filename (as referenced in the built output, e.g. "kl-angular-mark.png")
      of the image swapped for the customer's uploaded logo, if any. */
  logoFile?: string;
  /** Removed entirely -- the donor's own standalone "buy this site" CTA,
      wrong for every customer but the donor itself. */
  stripPatterns: RegExp[];
}

const NAME_TOKEN = "__W99_BIZ_NAME__";
const BASE_TOKEN = "__W99_BASE_PATH__";
const PHONE_TOKEN_PREFIX = "__W99_PHONE_";
const LOGO_TOKEN = "__W99_LOGO__";

/** Every one of these demo builds carries the same standalone "buy this
    site" Stripe banner (identical markup, identical Stripe link, across
    otherwise-unrelated sites -- clearly injected by whatever process
    exported them) -- wrong for every customer but the donor itself. */
const BUY_BANNER_PATTERN =
  /<div style="text-align:center;padding:40px 20px;background:#17181d;[\s\S]*?<\/div>/;
/** Unresolved Vite env-var placeholder left in a build that skipped setting
    VITE_ANALYTICS_ENDPOINT -- would otherwise request a literal, garbage
    URL for analytics that were never ours to begin with. */
const ANALYTICS_STUB_PATTERN =
  /<script defer src="%VITE_ANALYTICS_ENDPOINT%\/umami"[^>]*><\/script>/;
const COMMON_STRIPS = [BUY_BANNER_PATTERN, ANALYTICS_STUB_PATTERN];

export const REGISTRY: Record<string, DonorTemplate> = {
  "kl-construction": {
    key: "kl-construction",
    dir: path.join(process.cwd(), "..", "kl-construction"),
    businessNameLiteral: "K&L Construction",
    nameFragments: ["K&L"],
    taglineFragments: ["CONSTRUCTION & MAINTENANCE"],
    phoneLiterals: ["083 851 4297", "089 249 6440"],
    logoFile: "kl-angular-mark.png",
    stripPatterns: COMMON_STRIPS,
  },
  "d15-handyman": {
    key: "d15-handyman",
    dir: path.join(process.cwd(), "..", "d15-handyman"),
    businessNameLiteral: "D15 Handyman",
    nameFragments: ["D15"],
    taglineFragments: ["HANDYMAN", "SERVICES"],
    phoneLiterals: [], // no real phone in this build -- contact form only
    stripPatterns: COMMON_STRIPS,
  },
  "house-cleaning-dublin": {
    key: "house-cleaning-dublin",
    dir: path.join(process.cwd(), "..", "house-cleaning"),
    businessNameLiteral: "House Cleaning Dublin",
    // "House Cleaning" (logo/footer) and "HCD" (hero badge, service-list
    // prefixes) are both split away from the full literal. Not touching
    // bare "Dublin" -- too likely to collide with the customer's real town.
    nameFragments: ["House Cleaning", "HCD"],
    phoneLiterals: ["tel:+353000000000"], // donor's own number was itself a placeholder
    logoFile: "hcd-utility-door-mark_c0db7eb6.png",
    stripPatterns: COMMON_STRIPS,
  },
  "attridge-academy": {
    key: "attridge-academy",
    dir: path.join(process.cwd(), "..", "attridge-academy"),
    businessNameLiteral: "Attridge Academy",
    phoneLiterals: ["086 355 7288"],
    stripPatterns: COMMON_STRIPS,
  },
  "westprint3d": {
    key: "westprint3d",
    dir: path.join(process.cwd(), "..", "westprint3d"),
    businessNameLiteral: "WestPrint3D",
    phoneLiterals: [],
    stripPatterns: COMMON_STRIPS,
  },
  "hot-tub-store": {
    key: "hot-tub-store",
    dir: path.join(process.cwd(), "..", "hot-tub-store"),
    businessNameLiteral: "Hot Tub Chemical Super Store",
    phoneLiterals: [],
    logoFile: "logo.png",
    stripPatterns: COMMON_STRIPS,
  },
};

export function donorTemplateExists(key: string): boolean {
  return key in REGISTRY;
}

interface LoadedDonor {
  files: Record<string, string>;
  ownLogoDataUri: string | null; // fallback when the customer didn't upload one
}

/* Base (uncustomized) file map: images inlined, own-domain absolute prefix
   stripped, business name/base-path/logo left as tokens. Loaded from disk
   once per donor per process. */
const baseCache = new Map<string, Promise<LoadedDonor>>();

async function loadBase(t: DonorTemplate): Promise<LoadedDonor> {
  const allFiles = await listFiles(t.dir);
  const textFiles = allFiles.filter((f) => /\.(html|js|mjs|css)$/i.test(f));
  const imageMap = await buildImageMap(t.dir, t.logoFile);

  const out: Record<string, string> = {};
  for (const file of textFiles) {
    let content = await readFile(path.join(t.dir, file), "utf8");

    // Own absolute deploy prefix (e.g. "/kl-construction/x") -> bare root-relative.
    content = content.replaceAll(`/${t.key}/`, "/");
    content = inlineImages(content, imageMap, LOGO_TOKEN);

    for (const pattern of t.stripPatterns) content = content.replace(pattern, "");

    content = content.split(t.businessNameLiteral).join(NAME_TOKEN);
    for (const fragment of t.nameFragments ?? []) content = content.split(fragment).join(NAME_TOKEN);
    for (const tagline of t.taglineFragments ?? []) content = content.split(tagline).join("");
    t.phoneLiterals.forEach((phone, i) => {
      content = content.split(phone).join(`${PHONE_TOKEN_PREFIX}${i}__${phone}__`);
    });
    content = content.split(`"/${t.key}"`).join(`"${BASE_TOKEN}"`);

    out[file] = content;
  }
  return { files: out, ownLogoDataUri: imageMap.ownLogoDataUri };
}

function base(t: DonorTemplate): Promise<LoadedDonor> {
  let p = baseCache.get(t.key);
  if (!p) {
    p = loadBase(t);
    baseCache.set(t.key, p);
  }
  return p;
}

export interface DonorRenderVars {
  businessName: string;
  phone?: string;
  logoDataUrl?: string;
  basePath: string; // e.g. "/p/<preview-id>", no trailing slash
}

export async function renderDonorTemplate(key: string, vars: DonorRenderVars): Promise<Record<string, string>> {
  const t = REGISTRY[key];
  if (!t) throw new Error(`Unknown donor template: ${key}`);
  const { files, ownLogoDataUri } = await base(t);

  const phoneTokenRe = new RegExp(`${PHONE_TOKEN_PREFIX}\\d+__(.*?)__`, "g");
  const userPhone = vars.phone?.trim();
  const logo = vars.logoDataUrl || ownLogoDataUri || "";

  const out: Record<string, string> = {};
  for (const [file, raw] of Object.entries(files)) {
    const isHtml = file.endsWith(".html");
    const nameFilled = isHtml ? escapeHtml(vars.businessName) : escapeJsString(vars.businessName);
    let content = raw.replace(phoneTokenRe, (_m, originalPhone: string) => userPhone || originalPhone);
    content = content.split(NAME_TOKEN).join(nameFilled);
    content = content.split(BASE_TOKEN).join(vars.basePath);
    content = content.split(LOGO_TOKEN).join(logo);
    content = stripStrayDataUriSlash(content);
    out[file] = content;
  }
  return out;
}
