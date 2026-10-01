/* The section renderer: every layout renders a complete, sanitised, well-formed page. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSiteContent, VARIANTS } from "../lib/site-blocks.ts";
import { renderSite } from "../lib/site-render.ts";
import { palettes } from "../lib/palettes.ts";
import { finalizeHtml, siteProblems, fixNavigation } from "../lib/instant-site.ts";

const base = {
  brand: { name: "Acme & Sons <Plumbing>", tagline: "Plumbers in Cork" }, photoFolder: "plumber", palette: "fresh-green",
  hero: { eyebrow: "Cork", headline: "Plumbing you can rely on", sub: "Fast, tidy plumbers who turn up when they say they will and leave the place clean.", primaryCta: "Get a free quote", secondaryCta: "Our services", chips: ["Tidy", "Fast", "Local"] },
  services: { eyebrow: "What we do", title: "Plumbing and heating services", intro: "From a dripping tap to a full bathroom.", items: Array.from({ length: 7 }, (_, i) => ({ icon: "wrench", title: `Service ${i + 1}`, text: "We do this job properly and explain what we are doing as we go along." })) },
  values: { title: "Why people call us", items: Array.from({ length: 4 }, (_, i) => ({ icon: "clock", title: `Value ${i + 1}`, text: "A short sentence about why this matters to customers." })) },
  process: { eyebrow: "How it works", title: "Simple and straightforward", intro: "Four steps.", steps: Array.from({ length: 5 }, (_, i) => ({ title: `Step ${i + 1}`, text: "We keep it simple and keep you updated throughout the job." })) },
  about: { eyebrow: "About us", title: "A local family business", paragraphs: ["We are a local team with years of hands-on experience in the trade.", "We explain what we find and quote before any work starts."], bullets: ["Clear quotes", "Tidy work", "Local team"], cta: "Get in touch" },
  faq: { title: "Questions, answered", items: Array.from({ length: 5 }, (_, i) => ({ q: `Question number ${i + 1}?`, a: "A clear, helpful answer that explains how things work in plain English." })) },
  cta: { title: "Get in touch today", text: "We will come back to you quickly.", button: "Get a free quote" },
  contact: { phone: "087 123 4567", email: "hello@acme.ie", address: "Cork city", hours: "Mon–Fri 8–6" },
  footer: { blurb: "Plumbing and heating across Cork." },
};
const content = parseSiteContent(JSON.stringify(base), { folders: ["plumber"] });
const photos = { hero: { url: "https://web99.ie/library/plumber/hero.webp", alt: "Hero" }, work: { url: "https://web99.ie/library/plumber/work.webp", alt: "Work" }, detail: { url: "https://web99.ie/library/plumber/detail.webp", alt: "Detail" } };
const keys = Object.keys(VARIANTS);
const variants = (i) => Object.fromEntries(keys.map((k, j) => [k, VARIANTS[k][(i + j) % VARIANTS[k].length]]));

test("every variant of every section renders a page that passes the quality gate", () => {
  for (let i = 0; i < 13; i++) {
    for (const p of palettes) {
      const html = renderSite(content, { palette: p.id, variants: variants(i), seed: "t" }, photos);
      assert.deepEqual(siteProblems(html, { photos: true, palette: p }), [], `variant set ${i}, ${p.id}`);
    }
  }
});

test("pages without photos still render (photo-less layouts)", () => {
  const v = { ...variants(0), hero: "centered", about: "centered", cta: "accent" };
  const html = renderSite(content, { palette: "sky-blue", variants: v, seed: "t" }, {});
  assert.deepEqual(siteProblems(html, { palette: palettes.find((p) => p.id === "sky-blue") }), []);
  assert.doesNotMatch(html, /<img/);
});

test("model text is escaped, never interpreted as markup", () => {
  const evil = structuredClone(base);
  evil.brand.name = 'X"><script>alert(1)</script>';
  evil.hero.headline = "Great <img src=x onerror=alert(1)> plumbing";
  const c = parseSiteContent(JSON.stringify(evil), { folders: ["plumber"] });
  const html = finalizeHtml(renderSite(c, { palette: "fresh-green", variants: variants(0), seed: "t" }, photos));
  assert.doesNotMatch(html, /<script|onerror\s*=/i);
  assert.match(html, /Great plumbing/);
});

test("ampersands in a business name are escaped; tag-like text is dropped", () => {
  const html = renderSite(content, { palette: "fresh-green", variants: variants(0), seed: "t" }, photos);
  assert.match(html, /Acme &amp; Sons/);
  assert.doesNotMatch(html, /Acme & Sons|<Plumbing>/);
});

test("contact details become tel:/mailto: links only when given; anchors all resolve", () => {
  const html = finalizeHtml(renderSite(content, { palette: "fresh-green", variants: variants(1), seed: "t" }, photos));
  assert.match(html, /href="tel:0871234567"/);
  assert.match(html, /href="mailto:hello@acme\.ie"/);
  const none = renderSite({ ...content, contact: { phone: null, email: null, address: null, hours: null } }, { palette: "fresh-green", variants: variants(1), seed: "t" }, photos);
  assert.doesNotMatch(none, /tel:|mailto:/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/<a\b[^>]*\shref="#([^"]*)"/g)) if (m[1]) assert.ok(ids.includes(m[1]), `dead link #${m[1]}`);
  assert.ok(fixNavigation(html).includes('href="#contact"'));
});

test("the palette's exact colours and fonts are in the page", () => {
  const p = palettes.find((x) => x.id === "dark-gold");
  const html = renderSite(content, { palette: p.id, variants: variants(2), seed: "t" }, photos);
  for (const hex of [p.bg, p.accent, p.ink, p.dark]) assert.ok(html.toLowerCase().includes(hex.toLowerCase()), hex);
  assert.ok(html.includes(p.fontsHref.replace(/&/g, "&amp;")));
});
