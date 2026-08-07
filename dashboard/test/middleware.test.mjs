/* Every actual route in app/, checked against middleware's public list.
   This exists because of a real bug: "/login" (the page) was public but
   "/api/login" (the endpoint the page calls) was not, so the middleware
   redirected every login attempt before the password was ever checked.
   The page loading fine hid it completely — only the fetch() call failed.

   Listed here by hand rather than walking the filesystem, because the
   whole point is to also catch the day someone ADDS a route and forgets
   to update PUBLIC — a filesystem walk would only tell you about routes
   that already remembered to be listed correctly.
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicPath } from "../middleware.ts";

/* [path, mustBePublic, why] */
const routes = [
  // Sarah's chat — talked to by anyone before they're a customer at all.
  ["/api/chat", true, "the /start/ page, unauthenticated visitors"],

  // Login itself. The bug: this was false.
  ["/login", true, "the login page"],
  ["/api/login", true, "what the login page's form actually submits to"],

  // Post-payment customer pages/endpoints — no dashboard login exists for
  // a customer, so both halves of each of these must be public.
  ["/buy/abc-123", true, "the Stripe checkout redirect a customer clicks"],
  ["/choose/abc-123", true, "the stay-or-leave page after paying"],
  ["/api/choose/abc-123", true, "what the stay-or-leave page submits to"],

  // Stripe's webhook — Stripe, not a browser, calls this; it can't log in.
  ["/api/stripe", true, "Stripe's webhook, authenticated by signature not cookie"],

  // Everything operator-only must be gated. If any of these ever turns up
  // in PUBLIC, customer data or the ability to push a site is exposed.
  ["/", false, "the order queue"],
  ["/orders/abc-123", false, "a single order's review screen"],
  ["/api/orders/abc-123", false, "approve/reject/rebuild — real actions on real orders"],
  ["/api/setup", false, "runs SQL against the database"],
];

for (const [path, expected, why] of routes) {
  test(`${path} is ${expected ? "public" : "gated"} (${why})`, () => {
    assert.equal(isPublicPath(path), expected, `${path}: expected public=${expected}`);
  });
}

test("a public page prefix does not leak into an unrelated /api path", () => {
  // The exact shape of the bug: "/choose" must not be read as a prefix
  // that also happens to cover "/api/choose" — they don't share a prefix
  // at all, which is precisely why it's easy to miss.
  assert.equal(isPublicPath("/choose"), true);
  assert.equal(
    isPublicPath("/api/choose-something-unrelated"),
    false,
    "must not accidentally match on a shared string prefix"
  );
});
