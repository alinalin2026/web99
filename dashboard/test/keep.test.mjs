/* "Keep this for me" helpers that don't need a database. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { maskEmail, siteUrlFor } from "../lib/keep.ts";

test("maskEmail hides most of the name but keeps the domain", () => {
  assert.equal(maskEmail("jane@murphy.ie"), "j•••@murphy.ie");
  assert.equal(maskEmail("a@b.ie"), "a••@b.ie");
  assert.doesNotMatch(maskEmail("longername@gmail.com"), /longername/);
});

test("the emailed link is the new-tab view of that order (which carries the buy bar)", () => {
  const id = "3021ddd6-0ac7-4f6f-b375-c06a25b74b15";
  assert.match(siteUrlFor(id), new RegExp(`/api/instant-site/view/${id}$`));
});
