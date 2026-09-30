/* Stripe webhook helpers. Verifying a signature needs only the webhook signing secret (whsec_…), not an API
   key, so payments made through the existing Payment Link are recognised as soon as the secret is set. */
import Stripe from "stripe";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function verifyStripeEvent(rawBody: string, signature: string, secret: string): Stripe.Event {
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/** The order this event says has been PAID, or null if the event isn't a completed payment. Card payments are
    paid on `checkout.session.completed`; delayed methods (e.g. bank debits) arrive later as
    `checkout.session.async_payment_succeeded`, and their `completed` event is still "unpaid". */
export function paidSessionFrom(event: Stripe.Event): { orderId: string; session: Stripe.Checkout.Session } | null {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return null;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status === "unpaid") return null;
  const orderId = session.metadata?.orderId ?? session.client_reference_id ?? "";
  if (!UUID.test(orderId)) return null;
  return { orderId, session };
}
