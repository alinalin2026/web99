import { GENERATED_PAYMENT_LINKS } from "./payment-links.generated";

/* ===========================================================================
   ADD-ON PAYMENT LINKS
   ---------------------------------------------------------------------------
   Everything a customer buys AFTER the initial €99 site. Source of truth for
   prices: lib/prompts/pricing-and-services.md — keep the two in sync by hand.

   Each of these is a plain one-time Stripe Payment Link, not a dynamic
   Checkout Session like buy/[id]/route.ts uses for the €99 site — these
   don't need per-order line items, just a fixed price and a way to know
   which order paid (client_reference_id, appended by paymentLinkUrl below).

   scripts/setup-addon-links.ts creates the actual Stripe objects from this
   list and writes the IDs/URLs into payment-links.generated.ts.
   =========================================================================== */

export type AddonKey =
  | "fb-post"
  | "article"
  | "extra-page"
  | "landing-page"
  | "social-month"
  | "renewal"
  | "email-renewal"
  | "email-upgrade";

export interface AddonDefinition {
  key: AddonKey;
  label: string;
  /* Whole euro. Renewal/email-upgrade land on Stripe as one-time prices too —
     see the README note by "email-upgrade" on why that one is a judgement
     call rather than a certainty. */
  priceEur: number;
  description: string;
}

export const ADDONS: AddonDefinition[] = [
  {
    key: "fb-post",
    label: "Facebook post",
    priceEur: 4,
    description: "One-off Facebook post outside a monthly batch.",
  },
  {
    key: "article",
    label: "SEO / promotional article",
    priceEur: 9,
    description: "One SEO or promotional article for the site.",
  },
  {
    key: "extra-page",
    label: "Extra website page",
    priceEur: 49,
    description: "One additional page added to an existing site.",
  },
  {
    key: "landing-page",
    label: "Landing page",
    priceEur: 29,
    description: "A single standalone landing page.",
  },
  {
    key: "social-month",
    label: "1 month of social content (10 posts)",
    priceEur: 29,
    description: "One month of scheduled Facebook posts, beyond the initial three months.",
  },
  {
    key: "renewal",
    label: "Domain + hosting renewal",
    priceEur: 45,
    description: "Keeps the domain and hosting running for another year. Charged once, on request — not an auto-renewing subscription.",
  },
  {
    key: "email-renewal",
    label: "Business email renewal",
    priceEur: 15,
    description: "Keeps the business email running for another year. Charged once, on request — not an auto-renewing subscription.",
  },
  {
    key: "email-upgrade",
    label: "Email IMAP/Outlook upgrade",
    priceEur: 1,
    description:
      "Upgrades the business email so it works in Outlook/any IMAP client (Zoho Mail Lite). Priced here as a one-time €1 charge the customer repeats manually if they want it month to month — this is a judgement call, not a confirmed decision. See dashboard/README.md.",
  },
];

export function addonDefinition(key: AddonKey): AddonDefinition {
  const def = ADDONS.find((a) => a.key === key);
  if (!def) throw new Error(`Unknown addon key "${key}".`);
  return def;
}

/** The live Payment Link URL for one addon, tagged so the webhook knows which order paid. */
export function paymentLinkUrl(key: AddonKey, orderId: string): string {
  const entry = GENERATED_PAYMENT_LINKS[key];
  if (!entry?.url) {
    throw new Error(
      `No Payment Link for "${key}" yet — run "npm run setup:addon-links" with STRIPE_SECRET_KEY set.`
    );
  }
  const url = new URL(entry.url);
  url.searchParams.set("client_reference_id", orderId);
  return url.toString();
}

/** Reverse lookup used by the Stripe webhook: which addon does this Payment Link ID belong to? */
export function addonForPaymentLinkId(paymentLinkId: string): AddonDefinition | null {
  const match = Object.entries(GENERATED_PAYMENT_LINKS).find(
    ([, link]) => link.paymentLinkId === paymentLinkId
  );
  if (!match) return null;
  return ADDONS.find((a) => a.key === (match[0] as AddonKey)) ?? null;
}
