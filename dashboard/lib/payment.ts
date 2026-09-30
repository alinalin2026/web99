/* Where "Yes, I love it" sends a customer to pay. Until the Stripe API keys are on the server
   (STRIPE_SECRET_KEY, used by /buy/[id] for a full Checkout) this is the live €99 Payment Link the
   marketing site already uses (site.config.mjs -> stripePaymentLink). client_reference_id and
   prefilled_email let you tell in Stripe whose payment it is. */
export const PAYMENT_LINK = process.env.STRIPE_PAYMENT_LINK ?? "https://buy.stripe.com/3cIaEZ9UUgj014Z5o1cs800";

export function paymentLinkFor(orderId: string, email: string | null): string {
  const url = new URL(PAYMENT_LINK);
  url.searchParams.set("client_reference_id", orderId);
  if (email) url.searchParams.set("prefilled_email", email);
  return url.toString();
}
