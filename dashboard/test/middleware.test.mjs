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

/* [path, mustBePublicToMiddleware, why] */
const routes = [
  // Sarah's chat — talked to by anyone before they're a customer at all.
  ["/api/chat", true, "the /start/ page, unauthenticated visitors"],

  // Login itself. The bug: this was false.
  ["/login", true, "the login page"],
  ["/api/login", true, "what the login page's form actually submits to"],

  // Ops Agent does its own requireOperator() check in the route. It bypasses
  // middleware only so wrong/missing bearer auth returns JSON 401 instead of a
  // browser redirect to /control/login.
  ["/api/ops-agent", true, "route performs its own operator auth and needs API-style 401 responses"],

  // Post-payment customer pages/endpoints — no dashboard login exists for
  // a customer, so both halves of each of these must be public.
  ["/buy/abc-123", true, "the Stripe checkout redirect a customer clicks"],
  ["/choose/abc-123", true, "the stay-or-leave page after paying"],
  ["/api/choose/abc-123", true, "what the stay-or-leave page submits to"],

  // Stripe's webhook — Stripe, not a browser, calls this; it can't log in.
  ["/api/stripe", true, "Stripe's webhook, authenticated by signature not cookie"],

  // Scheduler endpoints authenticate themselves with CRON_SECRET.
  ["/api/cron/expire-previews", true, "scheduler endpoint, authenticated by CRON_SECRET not cookie"],

  // Everything operator-only that relies on middleware must be gated. If any
  // of these ever turns up in PUBLIC, customer data or build actions leak.
  ["/", false, "the order queue"],
  ["/orders/abc-123", false, "a single order's review screen"],
  ["/api/orders/abc-123", false, "approve/reject/rebuild — real actions on real orders"],
  ["/api/setup", false, "runs SQL against the database"],
  ["/api/send-email", false, "sends an email as Web99 to whatever address is typed in"],
];

for (const [path, expected, why] of routes) {
  test(`${path} is ${expected ? "public to middleware" : "gated by middleware"} (${why})`, () => {
    assert.equal(isPublicPath(path), expected, `${path}: expected public=${expected}`);
  });
}

test("a public page prefix does not leak into an unrelated /api path", () => {
  assert.equal(isPublicPath("/choose"), true);
  assert.equal(
    isPublicPath("/api/choose-something-unrelated"),
    false,
    "must not accidentally match on a shared string prefix"
  );
});
