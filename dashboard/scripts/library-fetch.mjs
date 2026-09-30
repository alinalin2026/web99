/* Step 1 of building the photo library: search Unsplash for candidates and write a contact sheet
   per trade so a person can pick the best hero / work / detail photo.

   Needs a free Unsplash API key in the environment:   UNSPLASH_ACCESS_KEY=...
   Usage (from dashboard/):  node --env-file=/srv/web99/config/dashboard.env scripts/library-fetch.mjs [key ...]
   Resumable: trades that already have a candidates file are skipped. Rate-limit aware (a demo key is
   50 requests/hour; the script waits and carries on rather than failing).

   Uses only the official API (search); photos are downloaded in library-build.mjs. */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { newTrades, generic } from "./library-trades.mjs";

const KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!KEY) { console.error("UNSPLASH_ACCESS_KEY is not set."); process.exit(1); }

const root = path.resolve(import.meta.dirname, "..", "..");
const WORK = process.env.LIBRARY_WORK ?? path.join(root, ".library-work");
const LIB = path.join(root, "dashboard", "public", "library");
const cacheDir = path.join(WORK, "candidates");
const sheetDir = path.join(WORK, "sheets");
fs.mkdirSync(cacheDir, { recursive: true });
fs.mkdirSync(sheetDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(url) {
  for (;;) {
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${KEY}`, "Accept-Version": "v1" } });
    const left = Number(res.headers.get("x-ratelimit-remaining") ?? 99);
    if (res.status === 403 || res.status === 429) {
      console.log("rate limit reached — waiting 5 minutes");
      await sleep(5 * 60_000);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    if (left <= 1) { console.log("almost out of requests this hour — waiting 61 minutes"); await sleep(61 * 60_000); }
    return res.json();
  }
}

const slim = (p, group) => ({
  id: p.id, group, w: p.width, h: p.height, likes: p.likes, alt: p.alt_description || p.description || "",
  color: p.color, thumb: p.urls.small, raw: p.urls.raw, page: p.links.html, download: p.links.download_location,
  by: p.user?.name ?? "", byUrl: p.user?.links?.html ?? "",
});

async function search(q, group) {
  const u = new URL("https://api.unsplash.com/search/photos");
  u.search = new URLSearchParams({ query: q, per_page: "20", orientation: "landscape", content_filter: "high", order_by: "relevant" });
  const data = await api(u);
  return data.results
    .filter((p) => p.width >= 2400 && p.width / p.height >= 1.35)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 6)
    .map((p) => slim(p, group));
}

async function sheet(key, cands) {
  const W = 400, H = 270, cols = 4, pad = 6, lab = 22;
  const rows = Math.ceil(cands.length / cols);
  const comps = [];
  for (let i = 0; i < cands.length; i++) {
    const x = (i % cols) * (W + pad), y = Math.floor(i / cols) * (H + lab + pad);
    const buf = Buffer.from(await (await fetch(cands[i].thumb)).arrayBuffer());
    comps.push({ input: await sharp(buf).resize(W, H, { fit: "cover" }).jpeg({ quality: 78 }).toBuffer(), left: x, top: y + lab });
    const label = `${i}  ${cands[i].group}  ${cands[i].w}px  ♥${cands[i].likes}`;
    comps.push({ input: Buffer.from(`<svg width="${W}" height="${lab}"><rect width="100%" height="100%" fill="#111"/><text x="6" y="16" font-size="14" font-family="sans-serif" fill="#fff">${label}</text></svg>`), left: x, top: y });
  }
  await sharp({ create: { width: cols * (W + pad), height: rows * (H + lab + pad), channels: 3, background: "#222" } })
    .composite(comps).jpeg({ quality: 76 }).toFile(path.join(sheetDir, `${key}.jpg`));
}

const wanted = process.argv.slice(2);
const todo = [...newTrades, ...generic].filter((t) => (!wanted.length || wanted.includes(t.key)) && !fs.existsSync(path.join(LIB, t.key, "hero.webp")));
console.log(`${todo.length} trades to search`);
for (const t of todo) {
  const file = path.join(cacheDir, `${t.key}.json`);
  if (fs.existsSync(file)) continue;
  const scene = await search(t.q, "scene");
  const close = await search(t.q2, "close-up");
  const cands = [...scene, ...close.filter((c) => !scene.some((s) => s.id === c.id))];
  if (!cands.length) { console.log(`${t.key}: nothing suitable found`); continue; }
  fs.writeFileSync(file, JSON.stringify({ key: t.key, label: t.label, candidates: cands }, null, 1));
  await sheet(t.key, cands);
  console.log(`${t.key}: ${cands.length} candidates -> sheets/${t.key}.jpg`);
}
console.log("done");
