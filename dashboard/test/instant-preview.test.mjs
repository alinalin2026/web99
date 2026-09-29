/* The pieces of the live preview that can be checked without OpenAI.
   Run: npm test  (from dashboard/) */

import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSarahReply, parsePreviewMarker } from "../lib/chat-markers.ts";
import { classifyTrade, buildTheme, normaliseStyle, LIBRARY } from "../lib/image-library.ts";
import { cleanFragment } from "../lib/instant-preview.ts";

test("classifyTrade picks the specific trade first", () => {
  assert.equal(classifyTrade("flower shop"), "florist");
  assert.equal(classifyTrade("window cleaner"), "cleaner");
  assert.equal(classifyTrade("Barber"), "barber");
  assert.equal(classifyTrade("emergency plumber and heating"), "plumber");
  assert.equal(classifyTrade("café and bakery"), "cafe");
  assert.equal(classifyTrade("car detailing"), "mechanic");
  assert.equal(classifyTrade("solicitor"), "professional");
  assert.equal(classifyTrade("something completely different"), "general");
});

test("normaliseStyle only allows the known styles", () => {
  assert.equal(normaliseStyle("Bold"), "bold");
  assert.equal(normaliseStyle("neon"), "modern");
  assert.equal(normaliseStyle(undefined), "modern");
});

test("every category builds a theme with a hero image layer", () => {
  for (const category of Object.keys(LIBRARY)) {
    const t = buildTheme({ businessName: "Test", trade: category, style: "classic" });
    assert.ok(t.css.includes("--glyph:url("), `${category}: glyph art present`);
    assert.ok(t.css.includes("#s-hero"), `${category}: hero slot styled`);
  }
});

test("a library photo becomes the hero image; no photo falls back to art only", () => {
  const barber = buildTheme({ businessName: "Joe's", trade: "barber" });
  assert.ok(barber.photoCount >= 1);
  assert.match(barber.css, /--hero-photo:url\("\/assets\/img\/hero-barber\.webp"\)/);
  const plumber = buildTheme({ businessName: "Pipes", trade: "plumber" });
  assert.match(plumber.css, /--hero-photo:none/);
});

test("PREVIEW and OPTIONS markers are parsed and stripped", () => {
  const raw =
    `Here's a first look — your own photos come after you pay. What should visitors do first?\n` +
    `[[PREVIEW: {"businessName":"Joe's Barbers","trade":"barber","location":"Cork","description":"Traditional cuts.","style":"bold"}]]\n` +
    `[[OPTIONS: Call me | WhatsApp me | Send an enquiry | See my work]]`;
  const r = parseSarahReply(raw);
  assert.equal(r.reply, "Here's a first look — your own photos come after you pay. What should visitors do first?");
  assert.equal(r.quickReplies.length, 4);
  assert.equal(r.preview?.businessName, "Joe's Barbers");
  assert.equal(r.preview?.style, "bold");
  assert.equal(r.preview?.location, "Cork");
});

test("a bad or trade-less PREVIEW marker is dropped, never shown", () => {
  assert.equal(parsePreviewMarker(`Hi [[PREVIEW: {oops}]]`).preview, null);
  assert.ok(!parsePreviewMarker(`Hi [[PREVIEW: {oops}]]`).rest.includes("PREVIEW"));
  assert.equal(parsePreviewMarker(`Hi [[PREVIEW: {"businessName":"X"}]]`).preview, null);
});

test("a single option is not turned into a button", () => {
  const r = parseSarahReply("Sure.\n[[OPTIONS: Only one]]");
  assert.equal(r.quickReplies.length, 0);
  assert.equal(r.reply, "Sure.");
});

test("cleanFragment strips active content from model output", () => {
  const dirty = `<section class="w99-hero"><h1 onclick="x()">Hi</h1><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">go</a><p>ok</p></section>`;
  const out = cleanFragment(dirty);
  assert.ok(!/script|onclick|onerror|javascript:|<img/i.test(out), out);
  assert.ok(out.includes("<h1>Hi</h1>") && out.includes("<p>ok</p>"));
});
