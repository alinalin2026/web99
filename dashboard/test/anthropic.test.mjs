/* The Claude call path, checked against the real SDK with a fake fetch — no key, no network.
   Run: npm test  (from dashboard/) */

import assert from "node:assert/strict";
import { test } from "node:test";

process.env.ANTHROPIC_API_KEY = "sk-ant-test";
delete process.env.ANTHROPIC_FALLBACKS;

// The SDK captures fetch when the (lazy) client is first built, so install this before any call.
const requests = [];
let handler = () => { throw new Error("no handler set"); };
globalThis.fetch = async (url, init) => {
  const call = { url: String(url), headers: new Headers(init.headers), body: JSON.parse(String(init.body ?? "{}")) };
  requests.push(call);
  return handler(call);
};

const { chat, text, json, MODELS } = await import("../lib/ai.ts");
const { createMessage, normalizeTurns, toEffort, tokenBudget } = await import("../lib/anthropic.ts");

const reply = (content, extra = {}) => ({
  id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5",
  content: Array.isArray(content) ? content : [{ type: "text", text: content }],
  stop_reason: "end_turn", stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 }, ...extra,
});
const ok = (body) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "request-id": "req_test" } });
const sse = (events) => new Response(events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(""), { status: 200, headers: { "content-type": "text/event-stream", "request-id": "req_test" } });
const reset = () => { requests.length = 0; };

test("Sarah's chat request is a well-formed Claude request", async () => {
  reset();
  handler = () => ok(reply("Hi there"));
  const out = await chat("SYSTEM", [
    { role: "assistant", content: "What's the business called?" },
    { role: "user", content: "Murphy Plumbing" },
  ]);
  assert.equal(out, "Hi there");
  const [req] = requests;
  assert.match(req.url, /\/v1\/messages/);
  assert.equal(req.headers.get("x-api-key"), "sk-ant-test");
  assert.equal(req.body.model, "claude-sonnet-5", "Sonnet 5 is the default for every role");
  assert.equal(req.body.system, "SYSTEM");
  assert.deepEqual(req.body.messages, [{ role: "user", content: "Murphy Plumbing" }], "leading assistant opener is dropped");
  assert.equal(req.body.output_config.effort, "low");
  assert.equal(req.body.max_tokens, 900 + 2000, "thinking headroom is added to the answer budget");
  for (const gone of ["temperature", "top_p", "top_k", "thinking", "instructions", "input", "reasoning"]) {
    assert.equal(gone in req.body, false, `${gone} must not be sent`);
  }
});

test("opus-5 opts into server-side refusal fallbacks; other models do not", async () => {
  reset();
  handler = () => ok(reply("ok"));
  await text("s", "u", "claude-opus-5", 500);
  assert.match(requests[0].headers.get("anthropic-beta") ?? "", /server-side-fallback-2026-07-01/);
  assert.equal(requests[0].body.fallbacks, "default");

  reset();
  await text("s", "u", "claude-sonnet-5", 500);
  assert.equal(requests[0].headers.get("anthropic-beta"), null);
  assert.equal("fallbacks" in requests[0].body, false);
  assert.equal(requests[0].body.output_config.effort, "medium", "unset effort falls back to the default");

  reset();
  process.env.ANTHROPIC_FALLBACKS = "off";
  await text("s", "u", "claude-opus-5", 500);
  delete process.env.ANTHROPIC_FALLBACKS;
  assert.equal("fallbacks" in requests[0].body, false);
});

test("effort is not sent to models that reject it", async () => {
  reset();
  handler = () => ok(reply("ok"));
  await text("s", "u", "claude-haiku-4-5", 500, undefined, "high");
  assert.equal("output_config" in requests[0].body, false);
});

test("a rejected fallback beta is retried once without it", async () => {
  reset();
  let n = 0;
  handler = () => (++n === 1
    ? new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "fallbacks is not enabled for this organization" } }), { status: 400, headers: { "content-type": "application/json" } })
    : ok(reply("recovered")));
  assert.equal(await text("s", "u", "claude-opus-5", 500), "recovered");
  assert.equal(requests.length, 2);
  assert.equal("fallbacks" in requests[1].body, false);
});

test("a safety refusal (HTTP 200) is surfaced as an error, not read as content", async () => {
  reset();
  handler = () => ok(reply([], { stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber", explanation: null } }));
  await assert.rejects(() => text("s", "u", "claude-opus-5", 500), /declined the request \(cyber\)/);
});

test("truncated output is retried with a bigger budget instead of returned", async () => {
  reset();
  let n = 0;
  handler = () => (++n === 1 ? ok(reply("half a sent", { stop_reason: "max_tokens" })) : ok(reply("a whole sentence.")));
  assert.equal(await text("s", "u", "claude-sonnet-5", 500), "a whole sentence.");
  assert.equal(requests.length, 2);
  assert.ok(requests[1].body.max_tokens > requests[0].body.max_tokens);
  assert.match(requests[1].body.system, /final answer directly/);
});

test("json() parses fenced replies and retries unusable ones", async () => {
  reset();
  handler = () => ok(reply('Sure:\n```json\n{"finished": true}\n```'));
  assert.deepEqual(await json("s", "u", MODELS.extract, 300, "minimal"), { finished: true });
  assert.match(requests[0].body.system, /Return ONLY one valid JSON object/);
  assert.equal(requests[0].body.output_config.effort, "low", "legacy 'minimal' maps to low");

  reset();
  let n = 0;
  handler = () => ok(reply(++n === 1 ? "no json here" : '{"a":1}'));
  assert.deepEqual(await json("s", "u", "claude-sonnet-5", 300), { a: 1 });
});

test("long generations stream, report progress, and assemble the final text", async () => {
  reset();
  const start = { type: "message_start", message: { ...reply([]), content: [], usage: { input_tokens: 1, output_tokens: 0 } } };
  handler = () => sse([
    start,
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "<html>" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "</html>" } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 4 } },
    { type: "message_stop" },
  ]);
  const seen = [];
  const message = await createMessage(
    { model: "claude-sonnet-5", system: "s", messages: [{ role: "user", content: "u" }], max_tokens: 32000, effort: "low" },
    { onText: (d) => seen.push(d) }
  );
  assert.deepEqual(seen, ["<html>", "</html>"]);
  assert.equal(message.content[0].text, "<html></html>");
  assert.equal(requests[0].body.stream, true);
});

test("a tool_use round trips: the controller-style forced tool call is returned as a tool_use block", async () => {
  reset();
  handler = () => ok(reply([{ type: "tool_use", id: "toolu_1", name: "build_site", input: {} }], { stop_reason: "tool_use" }));
  const message = await createMessage({
    model: "claude-opus-5", system: "s", messages: [{ role: "user", content: "{}" }], max_tokens: 600,
    tools: [{ name: "build_site", description: "d", input_schema: { type: "object", properties: {} } }],
    tool_choice: { type: "any" }, thinking: { type: "disabled" }, effort: "low",
  }, { fallbacks: false });
  assert.equal(message.content[0].name, "build_site");
  assert.deepEqual(requests[0].body.tool_choice, { type: "any" });
  assert.deepEqual(requests[0].body.thinking, { type: "disabled" });
});

test("turn normalisation and budgets", () => {
  assert.deepEqual(normalizeTurns([{ role: "assistant", content: "hi" }]), [{ role: "user", content: "(no text)" }]);
  assert.deepEqual(normalizeTurns([{ role: "user", content: "  " }, { role: "user", content: "x" }]),
    [{ role: "user", content: "(no text)" }, { role: "user", content: "x" }]);
  assert.equal(toEffort("minimal"), "low");
  assert.equal(toEffort(undefined), "low");
  assert.equal(tokenBudget(1000, "high"), 13000);
});
