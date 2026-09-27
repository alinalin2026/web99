import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

/* Shared by donor-templates.ts (whole-site reuse) and composed-templates.ts
   (section-by-section reuse) -- both personalize real, already-built site
   markup rather than generating content from scratch. */

const execFileAsync = promisify(execFile);
/* Scratch space for image optimization, deliberately NOT /tmp -- that's a
   small tmpfs on this box that has filled up before (see feedback memory on
   the EDQUOT outage). Runs once per donor per process, not per request. */
const SCRATCH_DIR = path.join(process.env.UPLOAD_DIR || "/srv/web99/uploads", ".donor-template-scratch");

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeJsString(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export function mimeFor(file: string): string {
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
export async function optimizeImage(bytes: Buffer, ext: string, isLogo: boolean): Promise<Buffer> {
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

/** Recursively lists files under `dir`, as paths relative to `dir` with
    forward slashes -- donor dist trees vary in shape (K&L keeps images at
    its root; Vite-processed builds hash and move them inside assets/), so
    this doesn't assume a layout. */
export async function listFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFiles(full, base)));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return out;
}

export interface DonorImageMap {
  images: Map<string, string>; // relative path -> data URI, excludes the logo
  ownLogoDataUri: string | null;
  logoRelPath: string | null; // full relative path -- needed so substitution doesn't leave a stray directory prefix behind
}

/** Reads and optimizes every image under a donor's directory once. Shared
    between whole-file (donor-templates.ts) and section-fragment
    (composed-templates.ts) personalization. */
export async function buildImageMap(dir: string, logoFile?: string): Promise<DonorImageMap> {
  const allFiles = await listFiles(dir);
  const imageFiles = allFiles.filter((f) => /\.(png|jpe?g|webp|svg)$/i.test(f));

  const images = new Map<string, string>();
  let ownLogoDataUri: string | null = null;
  let logoRelPath: string | null = null;
  for (const img of imageFiles) {
    const isLogo = path.basename(img) === logoFile;
    const raw = await readFile(path.join(dir, img));
    const optimized = await optimizeImage(raw, path.extname(img).toLowerCase(), isLogo);
    const dataUri = `data:${mimeFor(img)};base64,${optimized.toString("base64")}`;
    if (isLogo) {
      ownLogoDataUri = dataUri;
      logoRelPath = img;
    } else {
      images.set(img, dataUri);
    }
  }
  return { images, ownLogoDataUri, logoRelPath };
}

/** Replaces every image/logo reference found in `content` with its inlined
    data URI. Matches the bare relative path, not "/" + path, since donor
    references vary between root-absolute ("/kl-hero.jpg"), plain-relative
    ("images/hero.jpg"), and nested ("manus-storage/hash.jpg") -- a bare
    relative path is a substring of all three, so this covers each without
    needing to know which convention a given donor uses. */
export function inlineImages(content: string, map: DonorImageMap, logoToken: string): string {
  let out = content;
  for (const [img, dataUri] of map.images) {
    out = out.split(img).join(dataUri);
  }
  if (map.logoRelPath) out = out.split(map.logoRelPath).join(logoToken);
  return stripStrayDataUriSlash(out);
}

/** A root-absolute reference ("/kl-hero.jpg") leaves its leading "/" behind
    when only the bare relative path is matched and replaced -- corrupting
    the data: URI it was replaced with ("/data:image/..." isn't a data URI
    at all), and, if this content later passes through href/src rewriting,
    getting prefixed a second time on top of that. The same thing happens
    for a logo: inlineImages above only ever sees a token in its place, so
    it can't clean this up until *after* the token resolves to a real data:
    URI -- callers doing that resolution (donor-templates.ts,
    composed-templates.ts) must re-run this as a final pass. */
export function stripStrayDataUriSlash(content: string): string {
  return content.replace(/\/(data:[a-z]+\/[a-z0-9.+-]+;base64,)/gi, "$1");
}
