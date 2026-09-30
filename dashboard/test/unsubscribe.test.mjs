import test from "node:test";
import assert from "node:assert/strict";
import { UNSUBSCRIBE_UUID, unsubscribePage, unsubscribeUrlFor } from "../lib/unsubscribe.ts";
import { isPublicPath } from "../middleware.ts";

const ID = "3021ddd6-0ac7-4f6f-b375-c06a25b74b15";

test("the unsubscribe link points at this order and the route is reachable without a login", () => {
  assert.match(unsubscribeUrlFor(ID), new RegExp(`/api/unsubscribe/${ID}$`));
  assert.ok(isPublicPath(`/api/unsubscribe/${ID}`));
  assert.ok(UNSUBSCRIBE_UUID.test(ID) && !UNSUBSCRIBE_UUID.test("x; drop"));
});

test("the confirm page has a POST form (a GET must never unsubscribe by itself)", () => {
  const page = unsubscribePage("confirm", `/api/unsubscribe/${ID}`);
  assert.match(page, /<form method="post"/);
  assert.doesNotMatch(unsubscribePage("done", ""), /<form/);
});
