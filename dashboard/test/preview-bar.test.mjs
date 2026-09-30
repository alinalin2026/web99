/* The buy bar added to the standalone site view. Run: npm test (from dashboard/) */
import assert from "node:assert/strict";
import { test } from "node:test";
import { withPreviewBar } from "../lib/preview-bar.ts";

const ID = "3021ddd6-0ac7-4f6f-b375-c06a25b74b15";
const page = "<!doctype html><html><head><title>t</title></head><body><h1>Hi</h1><footer>f</footer></body></html>";

test("bar goes just before </body> and links to this order's buy route", () => {
  const out = withPreviewBar(page, ID);
  assert.ok(out.indexOf(`href="/buy/${ID}"`) > out.indexOf("<footer>"), "after the page content");
  assert.ok(out.indexOf(`href="/buy/${ID}"`) < out.lastIndexOf("</body>"), "before </body>");
  assert.match(out, /Do you like it\?/);
  assert.match(out, /Yes, I love it/);
  assert.match(out, /€99/);
});

test("the bar adds no script or handlers (the page is served without script permission)", () => {
  const out = withPreviewBar(page, ID);
  assert.equal(/<script|\son[a-z]+\s*=/i.test(out), false);
});

test("a page with no </body> still gets the bar, and non-UUID ids are refused", () => {
  assert.match(withPreviewBar("<h1>bare</h1>", ID), /Yes, I love it/);
  assert.throws(() => withPreviewBar(page, "1; DROP TABLE"), /order UUID/);
});

test("the bar also offers 'Chat about it', opening this order's workspace", () => {
  assert.match(withPreviewBar(page, ID), new RegExp(`href="/start/\\?site=${ID}">Chat about it`));
});
