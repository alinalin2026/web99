/* ===========================================================================
   WEB99 — WHAT WE ACTUALLY SELL
   ---------------------------------------------------------------------------
   The single source of truth for every promise made to a customer.

   Three things read this file and nothing else:
     - Sarah's system prompt (what she may offer)
     - the analyst prompt (what it may add to a brief)
     - the generator prompt (what it may build)

   The `status` field is the safety catch. Sarah and the generator are only
   ever shown items that are "included" or "addon". Anything "planned" is
   invisible to them, so a half-built idea can sit in this file for months
   without a customer ever being promised it.

   Add a capability here, and it becomes offerable everywhere at once.
   Flip it to "planned", and it disappears everywhere at once.
   =========================================================================== */

export type CapabilityStatus =
  /* Part of the €99. Sarah offers it freely, the generator always builds it. */
  | "included"
  /* Real, deliverable, costs extra. Sarah may mention it — priced, once. */
  | "addon"
  /* Not built yet. Never shown to any model. Kept here so it isn't forgotten. */
  | "planned";

export interface Capability {
  id: string;
  status: CapabilityStatus;
  /* Plain-English, customer-facing. This exact wording reaches the customer. */
  label: string;
  /* What it actually means in practice — the detail Sarah answers follow-ups with. */
  detail: string;
  /* Only for addons. Null where we haven't set a price we're willing to honour. */
  price?: string | null;
}

/* --- what the €99 buys ---------------------------------------------------- */

export const capabilities: Capability[] = [
  {
    id: "website",
    status: "included",
    label: "A complete website, designed around your business",
    detail:
      "Not a template with a name dropped in. Built for what this business actually does, in a design chosen to suit the trade.",
  },
  {
    id: "domain",
    status: "included",
    label: "Your own domain name, first year free",
    detail:
      "Registered in the customer's own name, not ours. Registered AFTER they pay — before that the site lives on a web99.ie preview address.",
  },
  {
    id: "hosting",
    status: "included",
    label: "Hosting, first year free",
    detail: "Everything the site runs on, for twelve months from launch.",
  },
  {
    id: "email",
    status: "included",
    label: "Business email with automatic replies",
    detail:
      "you@theirbusiness.ie, with an instant auto-reply going out to every enquiry so nobody is left waiting.",
  },
  {
    id: "content",
    status: "included",
    label: "All the words on the site, written for them",
    detail:
      "Written from what they tell us about the business. Never invented services, never invented prices.",
  },
  {
    id: "enquiry",
    status: "included",
    label: "A booking and enquiry system",
    detail:
      "A form that reaches them by email. Suitable for appointments, quotes and general enquiries.",
  },
  {
    id: "whatsapp-button",
    status: "included",
    label: "A WhatsApp button on the site",
    detail: "One tap and the customer is talking to the owner directly.",
  },
  {
    id: "facebook",
    status: "included",
    label: "A Facebook page, set up with three months of posts scheduled",
    detail:
      "Page built to match the site, then three months of posts written and scheduled. They are the admin from day one. After three months it stops unless they ask for more — it does not auto-charge.",
  },
  {
    id: "ai-assistant",
    status: "included",
    label: "An AI assistant on the site",
    detail:
      "Answers common questions from the site's own content — opening hours, services, location.",
  },
  {
    id: "shop",
    status: "included",
    label: "Selling online, if they need it",
    detail:
      "Card payments through a shop, or a simple order form where that suits better. Included in the €99. The payment provider's own transaction fee is not ours and is not included.",
  },
  {
    id: "language",
    status: "included",
    label: "Built in any language",
    detail:
      "The site is written and built in the language they ask for — not an auto-translated English template.",
  },
  {
    id: "three-changes",
    status: "included",
    label: "Three changes after they pay, free",
    detail:
      "Anything not right — hours, phone number, photos, wording. Three rounds, no charge, no argument.",
  },
  {
    id: "ownership",
    status: "included",
    label: "They own the domain and the files",
    detail:
      "Both in their name. They can leave whenever they like and take everything. We help them move it and do not charge for that.",
  },
  {
    id: "speed",
    status: "included",
    label: "Ready in 24 hours",
    detail: "Built and sent as a live link the next day.",
  },
  {
    id: "see-first",
    status: "included",
    label: "They see it finished and live before paying anything",
    detail:
      "No card details up front. If they do not want it, they pay nothing and there is nothing to cancel.",
  },
  {
    id: "google-basic",
    status: "included",
    label: "Set up so Google can read it, and submitted once live",
    detail:
      "Built to be indexed properly and submitted when it launches. We do NOT promise a top ranking — nobody honestly can. What we promise is that searching their business name finds them.",
  },

  /* --- year two ---------------------------------------------------------- */
  {
    id: "renewal",
    status: "addon",
    label: "Keeping the domain and hosting after the first year",
    detail:
      "Covers the domain registration and hosting for year two onward. That is the whole bill — no setup fee, no support fee, nothing that renews without being told first.",
    price: "€39 a year",
  },

  /* --- not built yet. Invisible to Sarah and the generator. ---------------
     Move to "addon" with a price the day it is genuinely deliverable, and it
     becomes offerable everywhere. Until then no model can promise it. ------ */
  {
    id: "care-plan",
    status: "planned",
    label: "Care plan — edits by WhatsApp, hosting, backups",
    detail:
      "Flat monthly. Covers hosting, unlimited reasonable edits by WhatsApp, backups and updates. Replaces per-edit charging after the three free changes are used.",
    price: null,
  },
  {
    id: "growth-plan",
    status: "planned",
    label: "Growth plan — care plan plus ongoing content",
    detail:
      "Care plan, plus Facebook content continuing past the first three months, Google Business Profile management, and a monthly one-page report.",
    price: null,
  },
  {
    id: "photography",
    status: "planned",
    label: "Professional photography",
    detail:
      "Not offered. We use the photos the customer already has. Do not promise a photographer.",
    price: null,
  },
  {
    id: "paid-ads",
    status: "planned",
    label: "Running paid advertising",
    detail: "Not offered. We build the site; running ads to it is a different job.",
    price: null,
  },
];

/* --- hard limits ----------------------------------------------------------
   Stated as flat refusals rather than absent capabilities, because these are
   the things a customer is most likely to push on, and a model that merely
   "doesn't know" will improvise. Injected verbatim into every prompt.       */

export const neverPromise: string[] = [
  "A specific Google ranking, a top spot, or a number of visitors. Say plainly that nobody can honestly promise that.",
  "A specific number of enquiries, customers or sales the site will produce.",
  "Professional photography, or that we will send a photographer.",
  "Running or managing paid advertising.",
  "A complete rebuild from scratch later at no cost. Three changes are free; a different site months later is a separate conversation.",
  "Any date faster than 24 hours, or same-day delivery.",
  "Absorbing the customer's card-processing fees if they sell online. Those are the payment provider's and stay with the customer.",
  "Any price other than €99 once and €39 a year after the first year. If asked about anything else, say we will confirm it before charging anything.",
  "Migrating or rebuilding an existing complex system (a booking platform, a stock system, an existing shop's database) without a human confirming it first.",
];

/* --- what a site cannot be built without ----------------------------------
   Sarah's real job. A lovely conversation that is missing the trade or the
   town cannot be built from, so she keeps going until these are answered.  */

export interface RequiredField {
  id: string;
  question: string;
  why: string;
}

export const requiredFields: RequiredField[] = [
  {
    id: "businessName",
    question: "What's the business called?",
    why: "Goes in the title, the header, the footer and the domain suggestion.",
  },
  {
    id: "trade",
    question: "What do you actually do?",
    why: "Decides the whole design direction and the structure of the pages.",
  },
  {
    id: "location",
    question: "What town or part of the city are you in?",
    why: "Local search is most of the value. A site with no place on it is worth far less.",
  },
  {
    id: "services",
    question: "What are the main things people come to you for?",
    why: "Becomes the services section. Must come from them — never invented.",
  },
  {
    id: "hours",
    question: "When are you open?",
    why: "The single most-looked-for thing on a small business site.",
  },
  {
    id: "phone",
    question: "What number should customers ring or WhatsApp?",
    why: "Powers the call button and the WhatsApp button.",
  },
  {
    id: "email",
    question: "What email should I send the finished site to?",
    why: "Delivery. Without it there is no way to hand the site over.",
  },
];

/* Nice to have. Sarah asks once, lightly, and never pushes. */
export const optionalFields: RequiredField[] = [
  {
    id: "existingDomain",
    question: "Do you already own a web address?",
    why: "If they do, we use it and skip the free one.",
  },
  {
    id: "language",
    question: "What language should the site be in?",
    why: "Defaults to English. We build in any language.",
  },
  {
    id: "photos",
    question: "Have you photos or a logo you'd like used?",
    why: "Real photos of the real place lift the result more than anything else.",
  },
  {
    id: "selling",
    question: "Do you need to sell anything online, or take bookings?",
    why: "Decides whether we build a shop, an order form or just an enquiry form.",
  },
  {
    id: "competitors",
    question: "Any site you've seen that you liked the look of?",
    why: "Fastest way to pin down taste without asking about design directly.",
  },
];

/* --- the commercial facts, in one place ---------------------------------- */

export const commercials = {
  price: "€99",
  priceNumeric: 9900,
  currency: "EUR",
  renewal: "€39 a year",
  turnaround: "24 hours",
  freeChanges: 3,
  paymentTiming: "after they have seen the finished site and said yes",
  refundPosition:
    "There is nothing to refund, because nothing is charged until they have seen it and agreed.",
};

/* --- helpers used by the prompt builders --------------------------------- */

/** Everything a model is allowed to offer. Never returns "planned" items. */
export function offerable(): Capability[] {
  return capabilities.filter((c) => c.status !== "planned");
}

export function included(): Capability[] {
  return capabilities.filter((c) => c.status === "included");
}

export function addons(): Capability[] {
  return capabilities.filter((c) => c.status === "addon");
}

/** Renders the offerable set as prompt-ready text. */
export function capabilityBlock(): string {
  const lines = included().map((c) => `- ${c.label}. ${c.detail}`);
  const extra = addons().map(
    (c) => `- ${c.label} — ${c.price ?? "price not set"}. ${c.detail}`
  );
  return (
    "INCLUDED IN THE €99:\n" +
    lines.join("\n") +
    "\n\nCOSTS EXTRA (mention only if relevant, always with the price):\n" +
    extra.join("\n")
  );
}

export function neverPromiseBlock(): string {
  return neverPromise.map((n) => `- ${n}`).join("\n");
}
