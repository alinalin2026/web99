import test from "node:test";
import assert from "node:assert/strict";
import { summarizeFunnel, sourceOf } from "../lib/funnel-stats.ts";

const row = (o = {}) => ({ createdAt: "2026-09-30T10:00:00Z", email: false, siteBuilt: false, chatted: false, cameBack: false, wantsIt: false, paid: false, source: "direct / organic", ...o });

test("counts every step and the percentages against start and previous step", () => {
  const rows = [
    row({ email: true, siteBuilt: true, chatted: true, wantsIt: true, paid: true, source: "facebook" }),
    row({ email: true, siteBuilt: true, chatted: true, cameBack: true, wantsIt: true, source: "facebook" }),
    row({ email: true, siteBuilt: true }),
    row({ email: true }),
    row(),
  ];
  const { steps } = summarizeFunnel(rows);
  const by = Object.fromEntries(steps.map((s) => [s.key, s]));
  assert.equal(by.createdAt.count, 5);
  assert.equal(by.email.count, 4);
  assert.equal(by.siteBuilt.count, 3);
  assert.equal(by.siteBuilt.ofStart, 60);
  assert.equal(by.siteBuilt.ofPrevious, 75);
  assert.equal(by.chatted.count, 2);
  assert.equal(by.chatted.ofPrevious, 66.7); // of the 3 who saw their site
  assert.equal(by.wantsIt.count, 2);
  assert.equal(by.paid.count, 1);
  assert.equal(by.paid.ofPrevious, 50); // of the 2 who tapped I love it
});

test("an empty window gives zeros, not NaN", () => {
  const { steps, sources } = summarizeFunnel([]);
  assert.ok(steps.every((s) => s.count === 0 && s.ofStart === 0));
  assert.deepEqual(sources, []);
});

test("sources are grouped and the biggest comes first", () => {
  const { sources } = summarizeFunnel([row({ source: "facebook", paid: true }), row({ source: "facebook" }), row()]);
  assert.deepEqual(sources.map((s) => [s.source, s.started, s.paid]), [["facebook", 2, 1], ["direct / organic", 1, 0]]);
});

test("source: utm_source wins, a bare fbclid means facebook, otherwise direct", () => {
  assert.equal(sourceOf("Google", "x"), "google");
  assert.equal(sourceOf(null, "IwAR123"), "facebook");
  assert.equal(sourceOf("", null), "direct / organic");
});
