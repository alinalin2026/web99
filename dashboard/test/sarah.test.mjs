/* Sarah's reply parsing and conversation flow — everything that can be checked without a model call.
   Run: npm test  (from dashboard/) */

import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSarahReply, conversationFacts, stateBlock } from "../lib/sarah-reply.ts";
import { decideStep, lastAssistantStep, confirmCount, quickFinished, stepDirective } from "../lib/sarah-flow.ts";
import { cleanFragment } from "../lib/instant-preview.ts";

const facts = (over = {}) => ({ email: null, phoneGiven: false, phoneAsked: false, whatsappAsked: false, userTurns: 1, ...over });

test("OPTIONS marker becomes buttons and is stripped", () => {
  const r = parseSarahReply("Is that all?\n[[OPTIONS: That's all | Add something]]");
  assert.equal(r.reply, "Is that all?");
  assert.deepEqual(r.quickReplies.map((q) => q.label), ["That's all", "Add something"]);
});

test("improvised markers never reach the customer", () => {
  const leak = parseSarahReply("Nice to meet you. What does your business do? [[PREVIEW pending]]");
  assert.equal(leak.reply, "Nice to meet you. What does your business do?");
  const json = parseSarahReply(`Enquiry form it is. [[PREVIEW update: {"businessName":"Murphy","trade":"renovations"}]]`);
  assert.equal(json.reply, "Enquiry form it is.");
  const cutOff = parseSarahReply("Great, thanks. [[OPTIONS: Yes | N");
  assert.equal(cutOff.reply, "Great, thanks.");
  assert.equal(cutOff.quickReplies.length, 0);
});

test("a single option is not a button", () => {
  const r = parseSarahReply("Sure.\n[[OPTIONS: Only one]]");
  assert.equal(r.quickReplies.length, 0);
  assert.equal(r.reply, "Sure.");
});

test("facts: email, phone and what Sarah already asked", () => {
  const f = conversationFacts([
    { role: "user", content: "Murphy Construction" },
    { role: "assistant", content: "What email should the preview go to?" },
    { role: "user", content: "it's alin.helpmyform@gmail.com" },
    { role: "assistant", content: "Could you leave a phone number?" },
    { role: "user", content: "085 123 4567" },
  ]);
  assert.equal(f.email, "alin.helpmyform@gmail.com");
  assert.equal(f.phoneGiven, true);
  assert.equal(f.phoneAsked, true);
  assert.equal(f.userTurns, 3);
});

test("an email address is not mistaken for a phone number", () => {
  const f = conversationFacts([{ role: "user", content: "sam1234567890@example.ie" }]);
  assert.equal(f.phoneGiven, false);
});

test("the flow asks for the email exactly once, even if the customer dodges it", () => {
  let step = decideStep({ prev: "name", facts: facts(), finished: false, confirms: 0, latest: "Mark's Nails" });
  assert.equal(step, "email");
  step = decideStep({ prev: "email", facts: facts({ userTurns: 2 }), finished: false, confirms: 0, latest: "I do gel nails in Dublin" });
  assert.equal(step, "describe");
  step = decideStep({ prev: "describe", facts: facts({ userTurns: 3 }), finished: false, confirms: 0, latest: "more customers" });
  assert.equal(step, "confirm");
});

test("an email in the very first message skips the email question", () => {
  assert.equal(decideStep({ prev: "name", facts: facts({ email: "a@b.ie" }), finished: false, confirms: 0, latest: "Joe, a@b.ie" }), "describe");
});

test("confirm repeats until finished, then contact, then close", () => {
  const base = { prev: "confirm", facts: facts({ email: "a@b.ie" }), confirms: 1, latest: "" };
  assert.equal(decideStep({ ...base, finished: false }), "confirm");
  assert.equal(decideStep({ ...base, finished: true }), "contact");
  assert.equal(decideStep({ ...base, finished: true, facts: facts({ email: "a@b.ie", phoneAsked: true }) }), "close");
  assert.equal(decideStep({ ...base, finished: false, confirms: 3, facts: facts({ email: "a@b.ie", phoneGiven: true }) }), "close");
});

test("a phone number in the contact step leads to one WhatsApp question, then close", () => {
  const f = facts({ email: "a@b.ie", phoneAsked: true });
  assert.equal(decideStep({ prev: "contact", facts: f, finished: false, confirms: 0, latest: "0851234567" }), "whatsapp");
  assert.equal(decideStep({ prev: "contact", facts: f, finished: false, confirms: 0, latest: "no thanks" }), "close");
  assert.equal(decideStep({ prev: "contact", facts: { ...f, whatsappAsked: true }, finished: false, confirms: 0, latest: "0851234567" }), "close");
  assert.equal(decideStep({ prev: "whatsapp", facts: f, finished: false, confirms: 0, latest: "yes" }), "close");
});

test("the last step is read from saved turns; old conversations count as mid-flow", () => {
  assert.equal(lastAssistantStep([]), "name");
  assert.equal(lastAssistantStep([{ role: "user", content: "x" }]), "name");
  assert.equal(lastAssistantStep([{ role: "assistant", content: "x", step: "confirm" }]), "confirm");
  assert.equal(lastAssistantStep([{ role: "assistant", content: "x" }]), "describe");
  assert.equal(confirmCount([{ role: "assistant", content: "", step: "confirm" }, { role: "assistant", content: "", step: "confirm" }]), 2);
});

test("button taps decide 'finished' without a model call", () => {
  const options = ["That's all", "Add something"];
  assert.equal(quickFinished("That's all", options), true);
  assert.equal(quickFinished("that’s all!", options), true);
  assert.equal(quickFinished("Add something", options), false);
  assert.equal(quickFinished("we also do emergency call-outs across south county Dublin and Wicklow on weekends", options), false);
  assert.equal(quickFinished("nope", options), null);
});

test("each step's directive names its job and only confirm/whatsapp ask for buttons", () => {
  for (const step of ["name", "email", "describe", "confirm", "contact", "whatsapp", "close"]) {
    const d = stepDirective(step, { confirms: 0, hasEmail: true });
    assert.match(d, /THIS TURN'S JOB/);
    assert.equal(/\[\[OPTIONS/.test(d), step === "confirm" || step === "whatsapp", step);
  }
  assert.match(stepDirective("describe", { confirms: 0, hasEmail: false }), /Do NOT mention email/);
});

test("state block lists only what is known", () => {
  assert.equal(stateBlock(facts(), null), "");
  const b = stateBlock(facts({ email: "a@b.ie" }), { businessName: "Murphy", trade: "builder" });
  assert.match(b, /a@b\.ie/);
  assert.match(b, /Murphy/);
});

test("cleanFragment strips active content from model output", () => {
  const dirty = `<section class="w99-hero"><h1 onclick="x()">Hi</h1><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">go</a><p>ok</p></section>`;
  const out = cleanFragment(dirty);
  assert.ok(!/script|onclick|onerror|javascript:|<img/i.test(out), out);
  assert.ok(out.includes("<h1>Hi</h1>") && out.includes("<p>ok</p>"));
});
