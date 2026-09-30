/* Step 2: turn the chosen photos into library folders.

   Reads <work>/selections.json:  { "pest-control": { "hero": "<unsplash id>", "work": "...", "detail": "..." }, ... }
   (ids come from the candidates files written by library-fetch.mjs), downloads each photo, resizes to
   1536x1024 WebP like the existing library, tells Unsplash it was downloaded (API requirement), writes the
   manifest entry (label, aliases, alt text) and records credits in public/library/credits.json.

   Usage (from dashboard/):  node --env-file=/srv/web99/config/dashboard.env scripts/library-build.mjs [--force]
   With no UNSPLASH_ACCESS_KEY it only syncs aliases into the manifest. */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { existing, newTrades, generic } from "./library-trades.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const WORK = process.env.LIBRARY_WORK ?? path.join(root, ".library-work");
const LIB = path.join(root, "dashboard", "public", "library");
const manifestPath = path.join(LIB, "manifest.json");
const creditsPath = path.join(LIB, "credits.json");
const KEY = process.env.UNSPLASH_ACCESS_KEY;
const force = process.argv.includes("--force");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const credits = fs.existsSync(creditsPath) ? JSON.parse(fs.readFileSync(creditsPath, "utf8")) : {};

for (const [key, aliases] of Object.entries(existing)) if (manifest[key]) manifest[key].aliases = aliases;

const selectionsPath = path.join(WORK, "selections.json");
const selections = fs.existsSync(selectionsPath) ? JSON.parse(fs.readFileSync(selectionsPath, "utf8")) : {};
const meta = new Map([...newTrades, ...generic].map((t) => [t.key, t]));
const SIZES = { hero: [1536, 1024, 78], work: [1536, 1024, 76], detail: [1536, 1024, 76] };

/* Unsplash asks API apps to report each download. Those calls count against the hourly limit, so they
   are queued in <work>/tracking-queue.json and flushed as far as the limit allows (rerun to finish). */
const queuePath = path.join(WORK, "tracking-queue.json");
const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, "utf8")) : [];
async function flushQueue() {
  if (!KEY) return;
  while (queue.length) {
    const res = await fetch(queue[0], { headers: { Authorization: `Client-ID ${KEY}`, "Accept-Version": "v1" } }).catch(() => null);
    if (!res || !res.ok) { console.log(`tracking paused (${res?.status ?? "network"}); ${queue.length} left — rerun later`); break; }
    queue.shift();
  }
  fs.writeFileSync(queuePath, JSON.stringify(queue));
}

const clean = (s) => s.replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase()).slice(0, 140);

if (process.argv.includes("--track")) { await flushQueue(); process.exit(0); }

for (const [key, picks] of Object.entries(selections)) {
  const t = meta.get(key);
  const file = path.join(WORK, "candidates", `${key}.json`);
  if (!t || !fs.existsSync(file)) { console.log(`skip ${key}: unknown trade or no candidates`); continue; }
  if (!force && fs.existsSync(path.join(LIB, key, "hero.webp"))) { console.log(`skip ${key}: already built`); continue; }
  if (!KEY) { console.log("UNSPLASH_ACCESS_KEY not set — cannot download"); break; }
  const cands = new Map(JSON.parse(fs.readFileSync(file, "utf8")).candidates.map((c) => [c.id, c]));
  fs.mkdirSync(path.join(LIB, key), { recursive: true });
  const alts = {};
  credits[key] = {};
  for (const role of ["hero", "work", "detail"]) {
    const c = cands.get(picks[role]);
    if (!c) { console.log(`${key}/${role}: id ${picks[role]} not among candidates`); continue; }
    const url = `${c.raw}${c.raw.includes("?") ? "&" : "?"}w=2400&fit=max&q=85&fm=jpg`;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const [w, h, q] = SIZES[role];
    await sharp(buf).resize(w, h, { fit: "cover", position: "attention" }).webp({ quality: q }).toFile(path.join(LIB, key, `${role}.webp`));
    queue.push(c.download);
    alts[role] = picks.alts?.[role] ?? clean(c.alt || `${t.label} — ${role}`);
    credits[key][role] = { photographer: c.by, profile: c.byUrl, photo: c.page };
    console.log(`${key}/${role} ok`);
  }
  manifest[key] = { label: t.label, aliases: t.aliases, ...(key.startsWith("generic-") ? { generic: true } : {}), alts };
}

await flushQueue();
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(creditsPath, JSON.stringify(credits, null, 2) + "\n");
console.log(`manifest: ${Object.keys(manifest).length} trades`);
