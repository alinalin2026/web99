import test from "node:test";
import assert from "node:assert/strict";
import { decideSiteFollowup, inSendWindow, dublinHour, MAX_OVERDUE_MS, isSiteKind, LEGACY_LEAD_KINDS } from "../lib/followups.ts";

// 2026-10-01 is in Irish Summer Time (UTC+1 until 25 Oct 2026): 11:00 UTC = 12:00 Dublin.
const NOON = new Date("2026-10-01T11:00:00Z");
const due = new Date(NOON.getTime() - 60_000);
const base = { kind: "site_24h", dueAt: due, email: "a@b.ie", followupEnabled: true, state: "collecting", paid: false, hasReply: false, recentlyActive: false };

test("a normal due nudge is sent", () => assert.deepEqual(decideSiteFollowup(base, NOON), { action: "send" }));

test("anything that means 'leave them alone' cancels the nudge for good", () => {
  for (const [patch, why] of [
    [{ email: null }, /no email/],
    [{ followupEnabled: false }, /unsubscribed/],
    [{ paid: true }, /bought/],
    [{ state: "won" }, /bought/],
    [{ state: "lost" }, /lost/],
    [{ hasReply: true }, /replied/],
  ]) {
    const d = decideSiteFollowup({ ...base, ...patch }, NOON);
    assert.equal(d.action, "cancel");
    assert.match(d.reason, why);
  }
});

test("a nudge more than 36h overdue is dropped, not sent late", () => {
  const late = new Date(NOON.getTime() - MAX_OVERDUE_MS - 1000);
  assert.equal(decideSiteFollowup({ ...base, dueAt: late }, NOON).action, "cancel");
});

test("nothing is sent at night (Dublin time), it waits for the morning", () => {
  const threeAm = new Date("2026-10-01T02:00:00Z"); // 03:00 Dublin
  assert.equal(dublinHour(threeAm), 3);
  assert.equal(inSendWindow(threeAm), false);
  assert.equal(decideSiteFollowup({ ...base, dueAt: new Date(threeAm.getTime() - 1000) }, threeAm).action, "wait");
  assert.equal(inSendWindow(new Date("2026-10-01T06:59:00Z")), false); // 07:59
  assert.equal(inSendWindow(new Date("2026-10-01T07:00:00Z")), true); // 08:00
  assert.equal(inSendWindow(new Date("2026-10-01T18:59:00Z")), true); // 19:59
  assert.equal(inSendWindow(new Date("2026-10-01T19:00:00Z")), false); // 20:00
});

test("winter time is handled too (GMT, no offset)", () => assert.equal(dublinHour(new Date("2026-12-01T09:00:00Z")), 9));

test("someone active in the last 12 hours is not interrupted, but the nudge isn't lost", () => {
  assert.equal(decideSiteFollowup({ ...base, recentlyActive: true }, NOON).action, "wait");
});

test("kind helpers", () => {
  assert.ok(isSiteKind("site_24h") && isSiteKind("site_3d") && !isSiteKind("24h"));
  assert.ok(LEGACY_LEAD_KINDS.has("30m") && LEGACY_LEAD_KINDS.has("24h") && LEGACY_LEAD_KINDS.has("3d"));
});
