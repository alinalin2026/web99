import test from "node:test";
import assert from "node:assert/strict";
import { parseSiteContent, VARIANTS, VARIANT_DEFAULTS, chooseVariants } from "../lib/site-blocks.ts";
import { renderSite } from "../lib/site-render.ts";
import { logoHtml, LOGO_STYLES, initials } from "../lib/logo.ts";
import { withPreviewBar } from "../lib/preview-bar.ts";
import { siteProblems } from "../lib/instant-site.ts";
import { palettes } from "../lib/palettes.ts";

const items = (n) => Array.from({ length: n }, (_, i) => ({ icon: "wrench", title: `Service ${i + 1}`, text: "We do this job properly and explain what we are doing as we go along." }));
const content = parseSiteContent(JSON.stringify({
  brand: { name: "Murphy & Sons <b>Plumbing</b>", tagline: "Plumbers in Cork", icon: "wrench" }, photoFolder: "plumber", palette: "fresh-green",
  hero: { eyebrow: "Cork", headline: "Plumbing you can rely on", sub: "Fast, tidy plumbers who turn up when they say they will and leave the place clean.", primaryCta: "Get a free quote", secondaryCta: "Our services", chips: ["Tidy", "Fast", "Local"] },
  services: { eyebrow: "What we do", title: "Plumbing and heating", intro: "From a tap to a bathroom.", items: items(6) },
  values: { title: "Why people call us", items: items(4) },
  process: { eyebrow: "How it works", title: "Simple", intro: "Four steps.", steps: items(4).map((x) => ({ title: x.title, text: x.text })) },
  about: { eyebrow: "About us", title: "A local business", paragraphs: ["We are a local team with years of experience in the trade."], bullets: ["Clear quotes", "Tidy work"], cta: "Get in touch" },
  faq: { title: "Questions", items: Array.from({ length: 4 }, (_, i) => ({ q: `Question ${i + 1}?`, a: "A clear, helpful answer in plain English for the customer." })) },
  cta: { title: "Get in touch", text: "We will come back quickly.", button: "Get a quote" },
  contact: { phone: "087 123 4567", email: "hello@acme.ie", address: "Cork", hours: "Mon-Fri" },
  footer: { blurb: "Plumbing across Cork." },
}), { folders: ["plumber"] });
const photos = { hero: { url: "https://web99.ie/library/plumber/hero.webp", alt: "Hero" }, work: { url: "https://web99.ie/library/plumber/work.webp", alt: "Work" }, detail: { url: "https://web99.ie/library/plumber/detail.webp", alt: "Detail" } };
const allVariants = (over = {}) => ({ ...Object.fromEntries(Object.keys(VARIANTS).map((k) => [k, VARIANTS[k][0]])), ...over });

test("every logo style renders the real, escaped business name next to its mark", () => {
  for (const style of LOGO_STYLES) {
    const html = logoHtml(content.brand, style);
    assert.match(html, /Murphy &amp; Sons &lt;b&gt;Plumbing|Murphy &amp; Sons/, style);
    assert.doesNotMatch(html, /<b>Plumbing/, style);
    for (const tag of ["svg", "span", "a"]) assert.equal((html.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? []).length, (html.match(new RegExp(`</${tag}>`, "g")) ?? []).length, `${style}: unbalanced <${tag}>`);
  }
});

test("an unknown (or retired) logo style falls back to the badge instead of breaking", () => {
  assert.match(logoHtml(content.brand, "mark"), /logo--badge/);
  assert.match(logoHtml(content.brand, "nonsense"), /logo--badge/);
});

test("initials skip filler words and handle one-word names", () => {
  assert.equal(initials("The Murphy & Sons Ltd"), "MS");
  assert.equal(initials("Mac"), "M");
});

test("the logo is drawn in palette variables only, so it works on the dark footer too", () => {
  for (const style of LOGO_STYLES) {
    const html = renderSite(content, { palette: "fresh-green", variants: allVariants({ logo: style }), seed: "t" }, photos);
    assert.doesNotMatch(logoHtml(content.brand, style), /#[0-9a-f]{6}\b/i, style);
    assert.ok((html.match(new RegExp(`logo--${style}`, "g")) ?? []).length >= 2, `${style} appears in header and footer`);
  }
});

test("every section order and the mosaic render, and the mosaic needs all three photos", () => {
  for (const order of VARIANTS.order) {
    const html = renderSite(content, { palette: "sky-blue", variants: allVariants({ order, gallery: "band" }), seed: "t" }, photos);
    assert.match(html, /class="mosaic"/);
    assert.deepEqual(siteProblems(html, { photos: true, palette: palettes.find((p) => p.id === "sky-blue") }), [], order);
  }
  const two = renderSite(content, { palette: "sky-blue", variants: allVariants({ gallery: "band" }), seed: "t" }, { hero: photos.hero, work: photos.work });
  assert.doesNotMatch(two, /class="mosaic"/);
});

test("the story order puts About straight after the hero; proof puts the values band there", () => {
  const at = (html, id) => html.indexOf(`id="${id}"`);
  const story = renderSite(content, { palette: "sky-blue", variants: allVariants({ order: "story" }), seed: "t" }, photos);
  assert.ok(at(story, "about") < at(story, "services"));
  const proof = renderSite(content, { palette: "sky-blue", variants: allVariants({ order: "proof" }), seed: "t" }, photos);
  assert.ok(at(proof, "why") < at(proof, "services"));
});

test("designs saved before gallery/order existed still render the original page", () => {
  const { gallery: _g, order: _o, ...old } = allVariants();
  const html = renderSite(content, { palette: "sky-blue", variants: old, seed: "t" }, photos);
  assert.doesNotMatch(html, /class="mosaic"/);
  assert.ok(html.indexOf('id="services"') < html.indexOf('id="process"'));
  assert.deepEqual(VARIANT_DEFAULTS, { gallery: "none", order: "classic" });
});

test("a phone gets a sticky Call + CTA bar, and the Web99 preview bar hides it so they don't stack", () => {
  const html = renderSite(content, { palette: "sky-blue", variants: allVariants(), seed: "t" }, photos);
  assert.match(html, /class="dock"[^>]*><a class="dock__call" href="tel:0871234567"/);
  const noPhone = parseSiteContent(JSON.stringify({ ...JSON.parse(JSON.stringify(content)), contact: { phone: null, email: null, address: null, hours: null } }), { folders: ["plumber"] });
  assert.doesNotMatch(renderSite(noPhone, { palette: "sky-blue", variants: allVariants(), seed: "t" }, photos), /<a class="dock__call"/);
  assert.match(withPreviewBar(html, "3021ddd6-0ac7-4f6f-b375-c06a25b74b15"), /\.dock\{display:none !important\}/);
});

test("photo-less sites never pick the photo-only layouts (split services, mosaic)", () => {
  for (let i = 0; i < 80; i++) {
    const v = chooseVariants(`s${i}`, { photos: false });
    assert.notEqual(v.services, "split");
    assert.equal(v.gallery, "none");
  }
});

test("a service section is never the only thing breaking the page: every services layout renders with and without photos", () => {
  for (const services of VARIANTS.services) {
    for (const ph of [photos, {}]) {
      const html = renderSite(content, { palette: "sky-blue", variants: allVariants({ services, hero: ph.hero ? "split-right" : "centered", about: ph.hero ? "photo-left" : "centered", cta: "accent" }), seed: "t" }, ph);
      assert.deepEqual(siteProblems(html, { palette: palettes.find((p) => p.id === "sky-blue") }), [], services);
    }
  }
});
