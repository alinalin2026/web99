/* "Keep this for me" helpers that don't need a database. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { maskEmail, siteUrlFor } from "../lib/keep.ts";

test("maskEmail hides most of the name but keeps the domain", () => {
  assert.equal(maskEmail("jane@murphy.ie"), "j•••@murphy.ie");
  assert.equal(maskEmail("a@b.ie"), "a••@b.ie");
  assert.doesNotMatch(maskEmail("longername@gmail.com"), /longername/);
});

test("the emailed link opens that order's workspace (preview, chat and buy button)", () => {
  const id = "3021ddd6-0ac7-4f6f-b375-c06a25b74b15";
  assert.match(siteUrlFor(id), new RegExp(`/start/\\?site=${id}$`));
});
