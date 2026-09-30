import test from "node:test";
import assert from "node:assert/strict";
import { siteFollowup } from "../lib/email.ts";

const args = { businessName: "Murphy & Sons <b>Plumbing</b>", siteUrl: "https://web99.ie/start/?site=abc&src=f24", unsubscribeUrl: "https://web99.ie/api/unsubscribe/abc" };

test("every nudge has the site link, the price, and a working unsubscribe link in both html and text", () => {
  for (const kind of ["site_24h", "site_3d"]) {
    const e = siteFollowup(kind, args);
    for (const part of [e.html, e.text]) {
      assert.match(part, /web99\.ie\/start\/\?site=abc/);
      assert.match(part, /€99/);
      assert.match(part, /api\/unsubscribe\/abc/);
      assert.match(part, /you built a website preview on web99\.ie/);
    }
  }
});

test("the business name is escaped in the html body so a hostile name can't inject markup", () => {
  const e = siteFollowup("site_24h", args);
  assert.doesNotMatch(e.html, /<b>Plumbing<\/b>/);
  assert.match(e.html, /Murphy &amp; Sons &lt;b&gt;Plumbing&lt;\/b&gt;/);
});

test("someone who tapped 'I love it' gets the 'one step away' version; the last email says it is the last", () => {
  assert.match(siteFollowup("site_24h", { ...args, wantsIt: true }).subject, /one step away/);
  assert.match(siteFollowup("site_24h", args).subject, /waiting/);
  const last = siteFollowup("site_3d", args);
  assert.match(last.text, /last email we'll send/);
});

test("it never promises things outside the offer (no business email, no free months)", () => {
  for (const kind of ["site_24h", "site_3d"]) {
    const e = siteFollowup(kind, args);
    assert.doesNotMatch(e.text, /business email|free month|discount|limited time|expires/i);
  }
});
