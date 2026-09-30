/* The "chat about your preview" logic that doesn't need a model or a database. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEdits, parsePreviewReply, previewChatSystem } from "../lib/preview-chat.ts";
import { parseSiteContent } from "../lib/site-blocks.ts";

const base = {
  brand: { name: "Acme Plumbing", tagline: "Plumbers in Cork", icon: "wrench" }, photoFolder: "plumber", palette: "fresh-green",
  hero: { eyebrow: "Cork", headline: "Plumbing you can rely on", sub: "Fast, tidy plumbers.", primaryCta: "Get a free quote", secondaryCta: "Services", chips: [{ icon: "clock", text: "Fast" }, { icon: "heart", text: "Tidy" }, { icon: "star", text: "Local" }] },
  services: { eyebrow: "What we do", title: "Services", intro: "Everything.", items: Array.from({ length: 4 }, (_, i) => ({ icon: "wrench", title: `Service ${i}`, text: "We do it well." })) },
  values: { title: "Why us", items: Array.from({ length: 3 }, (_, i) => ({ icon: "clock", title: `V${i}`, text: "Good." })) },
  process: { eyebrow: "How", title: "Simple", intro: "Easy.", steps: Array.from({ length: 3 }, (_, i) => ({ title: `S${i}`, text: "Do it." })) },
  about: { eyebrow: "About", title: "About us", paragraphs: ["We are plumbers."], bullets: ["A", "B"], cta: "Call" },
  faq: { title: "FAQ", items: Array.from({ length: 3 }, (_, i) => ({ q: `Q${i}?`, a: "Yes." })) },
  cta: { title: "Get in touch", text: "Call us.", button: "Quote" },
  contact: { phone: null, email: null, address: null, hours: null },
  footer: { blurb: "Plumbers." },
};
const content = parseSiteContent(JSON.stringify(base), { folders: ["plumber", "electrician"] });
const folders = ["plumber", "electrician"];

test("a JSON answer (even fenced) is read into its parts; unknown looks are ignored", () => {
  const r = parsePreviewReply('Sure!\n```json\n{"reply":"Done — new headline.","edits":{"hero":{"headline":"Cork\'s tidiest plumbers"}},"look":"darker","photoFolder":"electrician","needsTeam":null,"readyToBuy":false}\n```');
  assert.equal(r.reply, "Done — new headline.");
  assert.equal(r.look, "darker");
  assert.equal(r.photoFolder, "electrician");
  assert.equal(r.edits.hero.headline, "Cork's tidiest plumbers");
  assert.equal(parsePreviewReply('{"reply":"ok","look":"purple-rain"}').look, null);
});

test("a plain-text answer still works, with no changes", () => {
  const r = parsePreviewReply("Happy to help — what would you like to change?");
  assert.match(r.reply, /Happy to help/);
  assert.equal(r.edits, null);
  assert.equal(r.look, null);
  assert.equal(r.readyToBuy, false);
});

test("readyToBuy only when the model says true; needsTeam is trimmed text", () => {
  assert.equal(parsePreviewReply('{"reply":"x","readyToBuy":"yes"}').readyToBuy, false);
  assert.equal(parsePreviewReply('{"reply":"x","readyToBuy":true}').readyToBuy, true);
  assert.equal(parsePreviewReply('{"reply":"x","needsTeam":"  online shop  "}').needsTeam, "online shop");
});

test("edits merge into the copy; lists are replaced; the rest is untouched", () => {
  const out = applyEdits(content, { hero: { headline: "Cork's tidiest plumbers" }, services: { items: [{ icon: "droplet", title: "Leaks", text: "Fixed fast." }, { icon: "wrench", title: "Boilers", text: "Serviced." }, { icon: "flame", title: "Heating", text: "Installed." }] } }, folders);
  assert.equal(out.hero.headline, "Cork's tidiest plumbers");
  assert.equal(out.hero.sub, content.hero.sub);
  assert.equal(out.services.items.length, 3);
  assert.equal(out.services.items[0].icon, "droplet");
  assert.equal(out.services.title, "Services");
});

test("contact details the customer gives are applied; fake-looking ones are dropped", () => {
  const ok = applyEdits(content, { contact: { phone: "087 123 4567", email: "hello@acme.ie", hours: "Mon-Fri 9-5" } }, folders);
  assert.equal(ok.contact.phone, "087 123 4567");
  assert.equal(ok.contact.email, "hello@acme.ie");
  const bad = applyEdits(content, { contact: { phone: "ring us", email: "nope" } }, folders);
  assert.equal(bad.contact.phone, null);
  assert.equal(bad.contact.email, null);
});

test("edits can't smuggle in markup, a palette/photo change, or break the copy", () => {
  const out = applyEdits(content, { palette: "dark-gold", photoFolder: "electrician", hero: { headline: "Great <script>alert(1)</script> plumbing" } }, folders);
  assert.doesNotMatch(out.hero.headline, /[<>]/);
  assert.equal(out.palette, content.palette);
  assert.equal(out.photoFolder, "plumber");
  assert.throws(() => applyEdits(content, { services: { items: [] } }, folders), /services/);
  assert.throws(() => applyEdits(content, { about: { paragraphs: ["Lorem ipsum dolor"] } }, folders), /placeholder/);
});

test("Sarah's preview prompt carries the current copy, the looks, the folders and the offer rules", () => {
  const lib = [{ key: "plumber", label: "Plumber", terms: [], generic: false, images: [] }];
  const p = previewChatSystem(content, lib);
  assert.match(p, /Plumbing you can rely on/);
  assert.match(p, /lighter, darker, bolder, softer, photos/);
  assert.match(p, /plumber \(Plumber\)/);
  assert.match(p, /€99 once/);
  assert.match(p, /No business email is offered/);
  assert.match(p, /Never name a price or range/);
  assert.doesNotMatch(p, /fresh-green/, "the palette is not part of the editable copy");
});
