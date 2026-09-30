import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp, createLimiter } from "../lib/ratelimit.ts";

const req = (h) => new Request("http://x/", { headers: h });

test("clientIp trusts nginx's X-Real-IP and never a client-supplied first X-Forwarded-For", () => {
  assert.equal(clientIp(req({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.2.3.4, 203.0.113.9" })), "203.0.113.9");
  assert.equal(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" })), "203.0.113.9");
  assert.equal(clientIp(req({})), "unknown");
});

test("limiter allows up to max then blocks, per key", () => {
  const l = createLimiter(3, 60_000);
  assert.deepEqual([1, 2, 3, 4].map(() => l.allow("a")), [true, true, true, false]);
  assert.equal(l.allow("b"), true);
  assert.equal(l.allow("c", 5), false);
});
