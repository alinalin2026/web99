/* The instant-site HTML comes from a model that has read an owner's free-text
   description, so it is untrusted. These pin the sanitiser's guarantees. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { finalizeHtml, siteProblems } from "../lib/instant-site.ts";

const filler = "<p>" + "Content. ".repeat(600) + "</p>";
const page = (body, head = "") =>
  `<!doctype html><html><head><title>t</title>${head}</head><body>${body}${filler}</body></html>`;

test("strips scripts, handlers, embeds and javascript: URLs", () => {
  const html = finalizeHtml(
    page(
      `<script>alert(1)</script><a href="javascript:alert(2)" onclick="x()">a</a>` +
        `<img src="/library/plumber/hero.webp" onerror="x()"><iframe src="https://evil"></iframe>` +
        `<form action="https://evil"><button formaction="https://evil">go</button></form><base href="https://evil">`
    )
  );
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /<iframe|<base/i);
  assert.doesNotMatch(html, /action\s*=/i);
});

test("injects a strict CSP first in <head> and replaces any model-supplied one", () => {
  const html = finalizeHtml(page("<h1>x</h1>", `<meta http-equiv="Content-Security-Policy" content="default-src *">`));
  assert.match(html, /<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'/);
  assert.equal((html.match(/Content-Security-Policy/gi) ?? []).length, 1);
});

test("makes library image URLs absolute and adds the container guard", () => {
  const html = finalizeHtml(page(`<img src="/library/cafe/hero.webp"><div style="background:url('/library/cafe/work.webp')"></div>`));
  assert.match(html, /src="https:\/\/web99\.ie\/library\/cafe\/hero\.webp"/);
  assert.match(html, /url\('https:\/\/web99\.ie\/library\/cafe\/work\.webp'\)/);
  assert.match(html, /\.wrap\{[^}]*padding-left:clamp/);
});

test("removes markdown fences and preamble, rejects non-pages", () => {
  const fenced = "```html\nHere you go:\n" + page("<h1>x</h1>") + "\n```";
  assert.match(finalizeHtml(fenced), /^<!doctype html>/i);
  assert.throws(() => finalizeHtml("sorry, I cannot do that"), /not an HTML document/);
  assert.throws(() => finalizeHtml("<!doctype html><html><head></head><body>tiny</body></html>"), /not a complete page/);
});

const lib = (key, roles = ["hero", "work", "detail"]) => ({
  key, label: key, images: roles.map((role) => ({ role, url: `https://web99.ie/library/${key}/${role}.webp`, alt: role })),
});
const O = "https://web99.ie/library";

test("enforceLibrary keeps one trade: mismatched photos are remapped to the dominant trade", async () => {
  const { enforceLibrary } = await import("../lib/instant-site.ts");
  const library = [lib("florist"), lib("plumber")];
  const html = `<img src="${O}/florist/hero.webp"><img src="${O}/florist/work.webp"><img src="${O}/plumber/work.webp">`;
  const out = enforceLibrary(html, library);
  assert.equal((out.match(/plumber/g) ?? []).length, 0);
  assert.equal((out.match(new RegExp(`${O}/florist/work.webp`, "g")) ?? []).length, 2);
});

test("enforceLibrary remaps invented files and folders onto the dominant trade's real images", async () => {
  const { enforceLibrary } = await import("../lib/instant-site.ts");
  const library = [lib("cafe", ["hero"])];
  const out = enforceLibrary(`<img src="${O}/cafe/hero.webp"><img src="${O}/cafe/work.webp"><img src="${O}/nonsense/hero.webp">`, library);
  assert.equal(out, `<img src="${O}/cafe/hero.webp"><img src="${O}/cafe/hero.webp"><img src="${O}/cafe/hero.webp">`);
});

test("enforceLibrary blanks every library URL when none is valid, and leaves photo-free pages alone", async () => {
  const { enforceLibrary } = await import("../lib/instant-site.ts");
  assert.match(enforceLibrary(`<img src="${O}/ghost/hero.webp">`, [lib("cafe")]), /data:image\/gif/);
  assert.equal(enforceLibrary("<h1>no photos</h1>", [lib("cafe")]), "<h1>no photos</h1>");
});

test("every link lands on a real section: dead anchors, other pages and external links are remapped", () => {
  const html = finalizeHtml(
    page(
      `<nav><a href="#services">Services</a><a href="#how-it-works">How it works</a><a href="/about.html">About us</a>` +
        `<a href="https://facebook.com/x" target="_blank" rel="noopener">Find us</a><a href="contact.html">Contact</a><a href="#nowhere">Random</a></nav>` +
        `<section id="services">s</section><section id="process">p</section><section id="about">a</section><section>cta</section>`
    )
  );
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.includes("contact"), "a contact target is created when the page has none");
  const links = [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((m) => m[1]);
  for (const href of links) assert.ok(href === "#" || ids.includes(href.slice(1)), `dead link ${href}`);
  assert.match(html, /<a href="#process">How it works<\/a>/);
  assert.match(html, /<a href="#about">About us<\/a>/);
  assert.match(html, /<a href="#contact">Contact<\/a>/);
  assert.doesNotMatch(html, /target=|facebook\.com/);
});

test("mailto and tel links are left alone", () => {
  const html = finalizeHtml(page(`<a href="tel:+353123">Call</a><a href="mailto:a@b.ie">Mail</a><section id="contact">c</section>`));
  assert.match(html, /href="tel:\+353123"/);
  assert.match(html, /href="mailto:a@b\.ie"/);
});

const sections = (n) => Array.from({ length: n }, (_, i) => `<section id="s${i}"><div class="wrap"><h2>Section ${i}</h2><p>${"Real copy about the business. ".repeat(20)}</p></div></section>`).join("");
const good = `<!doctype html><html><head><title>t</title><style>${"a{color:red}".repeat(60)}</style></head><body><header><nav><ul><li><a href="#s1">One</a></li></ul></nav></header><h1>Hello</h1>${sections(6)}<footer>f</footer></body></html>`;

test("siteProblems: a complete page passes", () => {
  assert.deepEqual(siteProblems(good), []);
});

test("siteProblems: cut-off, unbalanced, thin and placeholder pages are all refused", () => {
  assert.ok(siteProblems(good.slice(0, Math.floor(good.length * 0.7))).length > 0, "truncated");
  assert.match(siteProblems(good.replace("</footer>", "")).join(), /footer/);
  assert.match(siteProblems(good.replace(/<\/div>/, "")).join(), /unbalanced <div>/);
  assert.match(siteProblems(good.replace(/<section[\s\S]*<\/section>/, "<section>x</section>")).join(), /fewer than 5 sections|too little text/);
  assert.match(siteProblems(good.replace("Real copy", "Lorem ipsum")).join(), /placeholder/);
  assert.match(siteProblems(good.replace("<h1>Hello</h1>", "")).join(), /headline/);
});
