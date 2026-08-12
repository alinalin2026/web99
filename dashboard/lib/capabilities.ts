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
    label: "An enquiry form with instant email alerts",
    detail:
      "A form on the site that reaches the owner by email the moment someone sends it. Standard on every site, like the WhatsApp button — never an upsell.",
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
    status: "addon",
    label: "An AI chat assistant on the site, with an owner dashboard",
    detail:
      "Answers common questions from the site's own content — hours, services, location — with a dashboard so the owner sees the conversations. Fits considered-purchase businesses best. Always quoted before anything starts.",
    price: "quoted per project, before anything starts",
  },
  {
    id: "shop",
    status: "planned",
    label: "Shop Setup (ecommerce)",
    detail:
      "NEVER part of the €99 and never offered to a lead. If a lead asks for a shop, Sarah says plainly it is not offered right now — no vague maybe. For PAYING customers it exists as a separately priced add-on (Stripe Connect Express only) quoted from pricing-and-services.md.",
    price: null,
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
      "Anything not right — hours, phone number, photos, wording. Three rounds, no charge, no argument. THREE, not ongoing — moving things, colours, text; not rebuilds. A fourth request is never refused, it is quoted. Regular posting or new articles are separate paid work.",
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
    label: "Preview within 48 hours, live within 5 business days",
    detail:
      "They see a real visual preview within 48 hours of the conversation, before paying anything. After payment, the finished site is live within 5 business days — the clock starts when their full details are in hand, not at payment.",
  },
  {
    id: "see-first",
    status: "included",
    label: "They see a real visual preview before paying anything",
    detail:
      "A live preview of the look and feel, no card details required. If they do not want it, they pay nothing and there is nothing to cancel. The full site is built after they pay.",
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
      "Covers the domain registration and hosting for year two onward. No setup fee, no support fee, nothing renews without being told first.",
    price: "€45 a year",
  },
  {
    id: "email-renewal",
    status: "addon",
    label: "Keeping the business email after the first year",
    detail: "The Zoho business email continuing from year two onward.",
    price: "€15 a year",
  },

  {
    id: "cal-booking",
    status: "addon",
    label: "Online booking through Cal.com",
    detail:
      "Real self-serve appointment booking. Fits appointment trades best. Always the customer's OWN Cal.com account, created and connected by them — we never hold their login. Quoted before anything starts.",
    price: "quoted per project, before anything starts",
  },

  /* =========================================================================
     THE UPSELL CATALOGUE — all "planned", so no model can offer them yet.
     -------------------------------------------------------------------------
     Set a price and flip to "addon" and it becomes offerable everywhere at
     once. Leave it here and it stays invisible.

     One rule ran the design of every item below: it has to deliver without
     anybody's presence. Anything needing a human on the day is priced as a
     project or not sold at all — that's the difference between a business
     that scales and a job that eats weekends.

     The trap to avoid: "AI makes it hands-off" is not true by itself. AI logo
     generation is hands-off right up until somebody wants a fourth revision.
     What keeps it hands-off is the PRODUCT SHAPE — a fixed number of options,
     self-serve regeneration, and no bespoke revision promise. Design the
     boundary in, don't assume the tool provides it.
     ========================================================================= */

  /* --- one-off, self-serve. The launch pack. ----------------------------- */
  {
    id: "logo",
    status: "planned",
    label: "A logo for the business",
    detail:
      "Generated to a brief, several options, they pick one and get the files in every format they need. Self-serve regeneration if they don't like the batch. NO bespoke revision rounds — that's what turns this into a job.",
    price: null,
  },
  {
    id: "brand-pack",
    status: "planned",
    label: "Matching business cards and print files",
    detail:
      "Print-ready PDFs using their logo and colours. They take them to any printer. We don't print, post or proof anything.",
    price: null,
  },
  {
    id: "email-templates",
    status: "planned",
    label: "Branded email templates and a signature",
    detail:
      "Quote, invoice, booking confirmation and follow-up templates in their brand, plus an email signature. Delivered as files, set up in their email once.",
    price: null,
  },
  {
    id: "social-art",
    status: "planned",
    label: "Social profile artwork",
    detail:
      "Facebook and Instagram cover images and profile pictures, matched to the site. Generated, not designed to order.",
    price: null,
  },
  {
    id: "extra-language",
    status: "planned",
    label: "The site in another language",
    detail:
      "A second full language version, written properly rather than machine-translated. Fully automated once the first site exists.",
    price: null,
  },
  {
    id: "extra-pages",
    status: "planned",
    label: "Extra pages",
    detail: "More pages on the same site, built the same way. Priced per page.",
    price: null,
  },
  {
    id: "google-profile",
    status: "planned",
    label: "Google Business Profile set up",
    detail:
      "Created and filled in from the site's own content so the two agree. Note: Google's verification step needs the OWNER to receive a postcard or call — we cannot do that part for them, and Sarah must say so.",
    price: null,
  },
  {
    id: "launch-bundle",
    status: "planned",
    label: "The full launch pack — everything a new business needs, in one",
    detail:
      "Site, logo, print files, email templates, social artwork and Google profile as a single bundle. This is the headline upsell: one price, one decision, nothing for the customer to assemble.",
    price: null,
  },

  /* --- recurring. Where the actual business is. ---------------------------
     Channel split, on purpose: WhatsApp is pre-sale — Sarah, enquiries, the
     three free changes. The Telegram bot is post-purchase — it's tied to one
     paying customer's one order, so it's the right place to gate paid
     features and take card payment for an add-on, which a shared WhatsApp
     number isn't set up to do cleanly. See dashboard/README.md. ---------- */
  {
    id: "content-assistant",
    status: "planned",
    label: "Your own assistant that writes and posts for you",
    detail:
      "Through the Telegram bot: they send a photo or a voice note — 'new arrivals in today' — and it writes the post, puts it on the site and on Facebook. Monthly. IMPORTANT: it drafts and THEY approve with one tap before anything publishes. An AI publishing unreviewed to a real business's public page is the single biggest support-hassle generator there is, and the approval tap costs the customer two seconds.",
    price: null,
  },
  {
    id: "facebook-ongoing",
    status: "planned",
    label: "Facebook posts continuing after the first three months",
    detail:
      "The scheduled posting carries on instead of stopping. Monthly, cancel any time, no notice period.",
    price: null,
  },
  {
    id: "care-plan",
    status: "planned",
    label: "Care plan — hosting, backups and edits",
    detail:
      "Flat monthly. Hosting, backups, and edits through the Telegram bot without counting them. Deliberately NOT cheap: this is the one item that consumes real time, so it must be priced so that a chatty customer is still profitable.",
    price: null,
  },
  {
    id: "seo",
    status: "planned",
    label: "SEO — ongoing search work",
    detail:
      "Not scoped yet. Flagged here because it was raised as a likely Telegram-bot upsell — do not let Sarah or the bot offer it until it has a defined deliverable and a price. 'SEO' sold vaguely is the classic way a web studio ends up owing a customer something undefined forever.",
    price: null,
  },
  {
    id: "articles",
    status: "planned",
    label: "Extra written articles for the site",
    detail:
      "One-off, bought through the Telegram bot. Same facts rule as everything else: written from what the owner actually tells the assistant, nothing invented.",
    price: null,
  },

  /* --- not offered. Kept here so the answer is written down. -------------- */
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
  "Any date faster than the two SLAs: preview within 48 hours, live site within 5 business days of full details being in hand. Never same-day.",
  "Absorbing the customer's card-processing fees if they sell online. Those are the payment provider's and stay with the customer.",
  "Any price other than €99 once, €45 a year for domain and hosting after year one, and €15 a year for email after year one. Anything else is quoted from the price list before it is agreed — never improvised.",
  "A refund, in any form. Refunds are never raised as a possibility. Work begins immediately on payment with the customer's consent and all sales are final.",
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
  renewal: "€45 a year",
  emailRenewal: "€15 a year",
  previewSla: "within 48 hours",
  deliverySla:
    "live within 5 business days — the clock starts when the full details are in hand, not at payment",
  turnaround: "48 hours to a visual preview, then 5 business days to live once details are in",
  freeChanges: 3,
  paymentTiming: "after they have seen the preview and decided to go ahead",
  refundPosition:
    "No refunds exist and they are never raised as a possibility. If asked directly: work begins immediately on payment with the customer's consent, and all sales are final.",
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
