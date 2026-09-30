/* Copy validation + design selection for the section-template builder. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSiteContent, chooseVariants, designFor, VARIANTS } from "../lib/site-blocks.ts";
import { isIcon } from "../lib/icons.ts";

const good = () => ({
  brand: { name: "Acme Plumbing", tagline: "Plumbers in Cork" }, photoFolder: "plumber", palette: "fresh-green",
  hero: { eyebrow: "Cork", headline: "Plumbing you can rely on", sub: "Fast, tidy plumbers.", primaryCta: "Get a free quote", secondaryCta: "Services", chips: ["Tidy", "Fast", "Local", "Extra"] },
  services: { eyebrow: "What we do", title: "Services", intro: "Everything.", items: Array.from({ length: 6 }, (_, i) => ({ icon: i === 0 ? "wrench" : "not-an-icon", title: `Service ${i}`, text: "We do it well." })) },
  values: { title: "Why us", items: Array.from({ length: 4 }, (_, i) => ({ icon: "clock", title: `V${i}`, text: "Good." })) },
  process: { eyebrow: "How", title: "Simple", intro: "Easy.", steps: Array.from({ length: 4 }, (_, i) => ({ title: `S${i}`, text: "Do it." })) },
  about: { eyebrow: "About", title: "About us", paragraphs: ["We are plumbers."], bullets: ["A", "B"], cta: "Call" },
  faq: { title: "FAQ", items: Array.from({ length: 4 }, (_, i) => ({ q: `Q${i}?`, a: "Yes." })) },
  cta: { title: "Get in touch", text: "Call us.", button: "Quote" },
  contact: { phone: "087 123 4567", email: "a@b.ie", address: null, hours: null },
  footer: { blurb: "Plumbers." },
});
const parse = (o, folders = ["plumber"]) => parseSiteContent(typeof o === "string" ? o : JSON.stringify(o), { folders });

test("a complete answer parses; fences/preamble around the JSON are tolerated", () => {
  const c = parse("Here you go:\n```json\n" + JSON.stringify(good()) + "\n```");
  assert.equal(c.brand.name, "Acme Plumbing");
  assert.equal(c.photoFolder, "plumber");
  assert.equal(c.palette, "fresh-green");
  assert.equal(c.hero.chips.length, 3, "chips capped at 3");
});

test("unknown icons fall back to real ones; unknown folder/palette become null", () => {
  const g = good(); g.photoFolder = "made-up"; g.palette = "neon";
  const c = parse(g);
  assert.ok(c.services.items.every((i) => isIcon(i.icon)));
  assert.equal(c.services.items[0].icon, "wrench");
  assert.equal(c.photoFolder, null);
  assert.equal(c.palette, null);
});

test("markup, control characters and overlong text are stripped or cut", () => {
  const g = good();
  g.hero.headline = "<script>alert(1)</script><b>Big</b> headline " + "word ".repeat(60);
  const c = parse(g);
  assert.doesNotMatch(c.hero.headline, /[<>]/);
  assert.ok(c.hero.headline.length <= 95);
});

test("incomplete, placeholder or non-JSON copy is rejected so the caller can retry", () => {
  const few = good(); few.services.items = few.services.items.slice(0, 2);
  assert.throws(() => parse(few), /services/);
  const lorem = good(); lorem.about.paragraphs = ["Lorem ipsum dolor sit amet."];
  assert.throws(() => parse(lorem), /placeholder/);
  assert.throws(() => parse("I can't do that"), /no JSON/);
  assert.throws(() => parse("{ not json }"), /valid JSON/);
});

test("contact details that don't look real are dropped", () => {
  const g = good(); g.contact = { phone: "call us!", email: "not-an-email", address: "1 Main St", hours: null };
  const c = parse(g);
  assert.equal(c.contact.phone, null);
  assert.equal(c.contact.email, null);
  assert.equal(c.contact.address, "1 Main St");
});

test("variants: always valid, photo-less pages avoid photo layouts, a new version avoids the previous layout", () => {
  for (let i = 0; i < 40; i++) {
    const v = chooseVariants("seed" + i, { photos: true });
    for (const k of Object.keys(VARIANTS)) assert.ok(VARIANTS[k].includes(v[k]), `${k}=${v[k]}`);
    const np = chooseVariants("seed" + i, { photos: false });
    assert.ok(["centered", "bold"].includes(np.hero) && np.about === "centered" && ["accent", "dark"].includes(np.cta));
    const next = chooseVariants("other" + i, { photos: true, avoid: v });
    assert.notEqual(next.hero, v.hero);
    assert.notEqual(next.services, v.services);
  }
  assert.deepEqual(chooseVariants("same", { photos: true }), chooseVariants("same", { photos: true }), "deterministic per seed");
});

test("style biases the design: darker -> dark palette, bolder -> bold palette", () => {
  const c = parse(good());
  for (let i = 0; i < 10; i++) {
    assert.match(designFor(c, { style: "darker", photos: true, seed: "d" + i }).palette, /^dark-/);
    assert.match(designFor(c, { style: "bolder", photos: true, seed: "b" + i }).palette, /^bold-/);
  }
  assert.equal(designFor(c, { photos: true }).palette, "fresh-green", "first build honours the model's palette");
});
