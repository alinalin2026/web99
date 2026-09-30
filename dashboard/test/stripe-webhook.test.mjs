import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { paidSessionFrom, verifyStripeEvent } from "../lib/stripe-webhook.ts";

const ID = "3021ddd6-0ac7-4f6f-b375-c06a25b74b15";
const secret = "whsec_test_secret";
const evt = (type, session) => ({ id: "evt_1", object: "event", type, data: { object: { object: "checkout.session", ...session } } });
const signed = (payload) => {
  const body = JSON.stringify(payload);
  return { body, sig: Stripe.webhooks.generateTestHeaderString({ payload: body, secret }) };
};

test("a correctly signed event verifies with only the signing secret (no API key needed)", () => {
  const { body, sig } = signed(evt("checkout.session.completed", { payment_status: "paid", client_reference_id: ID }));
  assert.equal(verifyStripeEvent(body, sig, secret).id, "evt_1");
});

test("a wrong secret or a tampered body is rejected", () => {
  const { body, sig } = signed(evt("checkout.session.completed", { payment_status: "paid", client_reference_id: ID }));
  assert.throws(() => verifyStripeEvent(body, sig, "whsec_other"));
  assert.throws(() => verifyStripeEvent(body.replace("paid", "unpaid"), sig, secret));
});

test("a Payment Link payment (order id only in client_reference_id) is matched to the order", () => {
  const got = paidSessionFrom(evt("checkout.session.completed", { payment_status: "paid", client_reference_id: ID }));
  assert.equal(got?.orderId, ID);
});

test("Checkout metadata wins over client_reference_id", () => {
  const other = "11111111-2222-3333-4444-555555555555";
  assert.equal(paidSessionFrom(evt("checkout.session.completed", { payment_status: "paid", metadata: { orderId: other }, client_reference_id: ID }))?.orderId, other);
});

test("an unpaid 'completed' session (delayed method) waits for the async success event", () => {
  assert.equal(paidSessionFrom(evt("checkout.session.completed", { payment_status: "unpaid", client_reference_id: ID })), null);
  assert.equal(paidSessionFrom(evt("checkout.session.async_payment_succeeded", { payment_status: "paid", client_reference_id: ID }))?.orderId, ID);
});

test("other events, and ids that aren't UUIDs, are ignored", () => {
  assert.equal(paidSessionFrom(evt("charge.refunded", { client_reference_id: ID })), null);
  assert.equal(paidSessionFrom(evt("checkout.session.completed", { payment_status: "paid", client_reference_id: "1; DROP TABLE orders" })), null);
  assert.equal(paidSessionFrom(evt("checkout.session.completed", { payment_status: "paid" })), null);
});
