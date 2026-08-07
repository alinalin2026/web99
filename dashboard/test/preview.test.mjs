/* Round-trip test for the preview furniture.
   Run: node --experimental-strip-types test/preview.test.mjs

   The two things that must hold, because both run against a real customer's
   paid-for website:
     1. injecting adds the buy buttons without disturbing their markup
     2. removing takes back exactly what was added, and nothing else
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  previewBanner,
  previewCloser,
  W99_START,
  W99_END,
} from "../lib/prompts/generator.ts";
import { removePreviewFurniture } from "../lib/github.ts";

const opts = { checkoutUrl: "https://dash.web99.ie/buy/abc", businessName: "Joe's Barbers" };

/* A site with the shapes most likely to break naive regex removal: divs after
   the sticky bar, a footer with nested divs, an apostrophe in the name. */
const original = `<!doctype html>
<html lang="en-IE"><head><title>Joe's Barbers — Drumcondra</title></head>
<body>
<header><h1>Joe's Barbers</h1></header>
<main>
  <div class="services"><div class="card">Cut</div><div class="card">Shave</div></div>
</main>
<footer><div class="cols"><div>Open Tue–Sat</div></div></footer>
</body></html>`;

function inject(html) {
  let out = html.replace(/<body([^>]*)>/i, (m) => `${m}\n${previewBanner(opts)}\n`);
  out = out.replace(/<footer([\s>])/i, `${previewCloser(opts)}\n<footer$1`);
  return out;
}

test("injection adds the buy buttons", () => {
  const injected = inject(original);
  assert.ok(injected.includes("Yes, I'll take it — €99"), "buy button present");
  assert.ok(injected.includes("nothing has been charged"), "preview notice present");
  assert.equal(injected.match(new RegExp(W99_START, "g")).length, 2, "two fenced blocks");
  assert.equal(injected.match(new RegExp(W99_END, "g")).length, 2, "two closing fences");
});

test("injection leaves the customer's own markup untouched", () => {
  const injected = inject(original);
  assert.ok(injected.includes('<div class="services">'), "services div survived");
  assert.ok(injected.includes('<div class="card">Shave</div>'), "cards survived");
  assert.ok(injected.includes("<footer><div class=\"cols\">"), "footer survived");
});

test("removal restores the original exactly", () => {
  const injected = inject(original);
  const stripped = removePreviewFurniture(injected);

  assert.ok(!stripped.includes("w99"), "no furniture left behind");
  assert.ok(!stripped.includes("Yes, I'll take it"), "no buy button left");
  assert.equal(
    stripped.replace(/\s+/g, " ").trim(),
    original.replace(/\s+/g, " ").trim(),
    "byte-for-byte back to the original (whitespace-normalised)"
  );
});

test("the business name is escaped, not injected raw", () => {
  const nasty = previewCloser({
    checkoutUrl: "https://x/buy/1",
    businessName: '<script>alert(1)</script>',
  });
  assert.ok(!nasty.includes("<script>"), "script tag escaped");
  assert.ok(nasty.includes("&lt;script&gt;"), "escaped form present");
});
