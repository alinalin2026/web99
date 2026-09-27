import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
/* Scratch space for image optimization, deliberately NOT /tmp -- that's a
   small tmpfs on this box that has filled up before (see feedback memory on
   the EDQUOT outage). This runs once per donor per process, not per request. */
const SCRATCH_DIR = path.join(process.env.UPLOAD_DIR || "/srv/web99/uploads", ".donor-template-scratch");

/* ===========================================================================
   DONOR TEMPLATES
   ---------------------------------------------------------------------------
   For trades with a real, already-built site design on this box (Manus-style
   static bundle) -- reuse that design for every instant-preview customer in
   that trade, personalized by swapping the business name / logo / phone.
   Everything else (service descriptions, testimonials, imagery) stays as
   the donor's own copy: a placeholder for "here's roughly how it'll look",
   not a per-customer content generator.

   File contents are cached in memory per donor key with the business name
   still a token, since the images (base64-inlined) make loading each one
   from disk non-trivial -- only a cheap string replace runs per preview.
   =========================================================================== */

interface DonorTemplate {
  key: string;
  dir: string; // absolute path to the built dist directory
  businessNameLiteral: string;
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

const REGISTRY: Record<string, DonorTemplate> = {
  "kl-construction": {
    key: "kl-construction",
    dir: path.join(process.cwd(), "..", "kl-construction"),
    businessNameLiteral: "K&L Construction",
    phoneLiterals: ["083 851 4297", "089 249 6440"],
    logoFile: "kl-angular-mark.png",
    stripPatterns: [
      /<div style="text-align:center;padding:40px 20px;background:#17181d;[\s\S]*?<\/div>/,
    ],
  },
};

export function donorTemplateExists(key: string): boolean {
  return key in REGISTRY;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsString(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

/** Donor photos come straight off a phone/export, often 4-5MB+ -- inlining
    them raw as base64 would balloon every preview page to tens of MB (see
    feedback memory on image sizes). Resize + recompress once via
    ImageMagick before caching. Logos get a smaller cap since they're
    rendered tiny; photos keep enough resolution for a full-bleed hero. */
async function optimizeImage(bytes: Buffer, ext: string, isLogo: boolean): Promise<Buffer> {
  if (ext === ".svg") return bytes; // vector, nothing to do
  await mkdir(SCRATCH_DIR, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inFile = path.join(SCRATCH_DIR, `in-${id}${ext}`);
  const outFile = path.join(SCRATCH_DIR, `out-${id}${ext}`);
  try {
    await writeFile(inFile, bytes);
    const args = isLogo
      ? [inFile, "-resize", "480x480>", "-strip", outFile]
      : [inFile, "-resize", "1600x1600>", "-quality", "78", "-strip", outFile];
    await execFileAsync("convert", args);
    return await readFile(outFile);
  } finally {
    await rm(inFile, { force: true });
    await rm(outFile, { force: true });
  }
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
  const entries = await readdir(t.dir, { withFileTypes: true });
  const topFiles = entries.filter((e) => e.isFile()).map((e) => e.name);
  const htmlFiles = topFiles.filter((f) => f.endsWith(".html"));
  const imageFiles = topFiles.filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f));

  const assetDirEntries = await readdir(path.join(t.dir, "assets"), { withFileTypes: true }).catch(() => []);
  const assetFiles = assetDirEntries.filter((e) => e.isFile()).map((e) => `assets/${e.name}`);

  const textFiles = [...htmlFiles, ...assetFiles.filter((f) => /\.(js|mjs|css)$/i.test(f))];

  const images = new Map<string, string>(); // filename -> data URI
  let ownLogoDataUri: string | null = null;
  for (const img of imageFiles) {
    const isLogo = img === t.logoFile;
    const raw = await readFile(path.join(t.dir, img));
    const optimized = await optimizeImage(raw, path.extname(img).toLowerCase(), isLogo);
    const dataUri = `data:${mimeFor(img)};base64,${optimized.toString("base64")}`;
    if (isLogo) {
      ownLogoDataUri = dataUri;
    } else {
      images.set(img, dataUri);
    }
  }

  const out: Record<string, string> = {};
  for (const file of textFiles) {
    let content = await readFile(path.join(t.dir, file), "utf8");

    // Own absolute deploy prefix (e.g. "/kl-construction/x") -> bare root-relative.
    content = content.replaceAll(`/${t.key}/`, "/");

    for (const [img, dataUri] of images) {
      content = content.split(`/${img}`).join(dataUri);
    }
    if (t.logoFile) content = content.split(`/${t.logoFile}`).join(LOGO_TOKEN);

    for (const pattern of t.stripPatterns) content = content.replace(pattern, "");

    content = content.split(t.businessNameLiteral).join(NAME_TOKEN);
    t.phoneLiterals.forEach((phone, i) => {
      content = content.split(phone).join(`${PHONE_TOKEN_PREFIX}${i}__${phone}__`);
    });
    content = content.split(`"/${t.key}"`).join(`"${BASE_TOKEN}"`);

    out[file] = content;
  }
  return { files: out, ownLogoDataUri };
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
    out[file] = content;
  }
  return out;
}
