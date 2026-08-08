import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const demoRoot = join(root, "dist", "assets", "workspace-solutions");

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const baseScript = `<script>(function(){var p=location.hostname.endsWith('github.io')?'/web99/assets/workspace-solutions/':'/assets/workspace-solutions/';document.write('<base href="'+p+'">');})();</script>`;

for (const file of await htmlFiles(demoRoot)) {
  let html = await readFile(file, "utf8");
  html = html
    .replaceAll('href="/assets/workspace-solutions/"', 'href="./"')
    .replaceAll('href="/assets/workspace-solutions/', 'href="')
    .replaceAll('src="/assets/workspace-solutions/', 'src="');

  if (!html.includes("location.hostname.endsWith('github.io')")) {
    html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">${baseScript}`);
  }
  await writeFile(file, html, "utf8");
}

console.log("Workspace Solutions preview paths made portable");
