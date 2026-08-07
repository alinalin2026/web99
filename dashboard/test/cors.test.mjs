/* Regression test for the bug that made every message to Sarah fail
   silently: web99.ie (the marketing site) and this app live on different
   domains, /start/'s fetch() sends application/json (not a CORS-"simple"
   content type), so the browser preflights with OPTIONS — and with no CORS
   headers at all, that preflight failed and the browser blocked the real
   request before it left the page. The UI's own network-error fallback was
   firing correctly, on a genuine failure one layer down.
*/

import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { corsPreflight, withCors } from "../lib/cors.ts";

function reqFrom(origin) {
  return new NextRequest("https://web99dashboard.vercel.app/api/chat", {
    method: "OPTIONS",
    headers: origin ? { origin } : {},
  });
}

test("preflight from the marketing site is allowed", () => {
  const res = corsPreflight(reqFrom("https://web99.ie"));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "https://web99.ie");
  assert.match(res.headers.get("access-control-allow-methods") ?? "", /POST/);
});

test("preflight from the www variant is allowed", () => {
  const res = corsPreflight(reqFrom("https://www.web99.ie"));
  assert.equal(res.headers.get("access-control-allow-origin"), "https://www.web99.ie");
});

test("preflight from an unrelated site is not granted access", () => {
  const res = corsPreflight(reqFrom("https://some-other-site.example"));
  // The response can still be 204 (an OPTIONS reply isn't itself sensitive),
  // but it must NOT carry an Allow-Origin the browser would honour.
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("preflight with no Origin header (non-browser caller) gets no CORS headers", () => {
  const res = corsPreflight(reqFrom(null));
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("withCors attaches the header to a real response for an allowed origin", () => {
  const req = reqFrom("https://web99.ie");
  const res = withCors(req, new Response(JSON.stringify({ ok: true }), { status: 200 }));
  assert.equal(res.headers.get("access-control-allow-origin"), "https://web99.ie");
});

test("withCors does not grant an unrelated origin access to the response", () => {
  const req = reqFrom("https://some-other-site.example");
  const res = withCors(req, new Response(JSON.stringify({ ok: true }), { status: 200 }));
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});
