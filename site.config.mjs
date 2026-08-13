/* ===========================================================================
   WEB99.IE — SINGLE SOURCE OF TRUTH FOR EVERY PLACEHOLDER VALUE
   ---------------------------------------------------------------------------
   Everything in this file is stitched into the HTML at build time.
   Edit here, run `npm run build`, and every page updates. Nothing else to hunt.
   =========================================================================== */

export const config = {
  /* --- Business ------------------------------------------------------- */
  siteName: "Web99.ie",
  domain: "https://web99.ie",
  price: "€99",

  /* --- Payments ---------------------------------------------------------- */
  /* Stripe Payment Link for the €99 website package (live mode). */
  stripePaymentLink: "https://buy.stripe.com/3cIaEZ9UUgj014Z5o1cs800",

  /* --- The dashboard app ------------------------------------------------- */
  /* Where /start/ sends the conversation. The app lives in dashboard/ and is
     deployed separately from this static site. Leave empty for same-origin. */
  dashboardUrl: "",

  /* --- WhatsApp -------------------------------------------------------- */
  /* TODO: REPLACE. Full international format, digits only, no + and no spaces.
     Irish mobile 087 123 4567  ->  353871234567                             */
  whatsappNumber: "353000000000",
  whatsappPrefill: "Hi, I saw Web99 and I'd like a website for my business.",

  /* --- Live counter (Section 7) ---------------------------------------- */
  /* TODO: REPLACE with the real figure. This is the ONLY place it lives.
     Set counterEnabled to false to hide the whole band until it's true.    */
  counterEnabled: true,
  counterValue: 57,
  counterLabel: "Irish businesses brought online.",

  /* --- Year two renewal (FAQ + pricing) -------------------------------- */
  renewalPrice: "€45 a year",
  emailRenewalPrice: "€15 a year",

  /* --- Testimonials ----------------------------------------------------- */
  /* Leave empty until there are REAL customers who have agreed to be named.
     Empty array = styled empty slots render. Do not invent entries.
     Shape: { quote: "...", name: "...", business: "...", town: "..." }     */
  testimonials: [],

  /* --- The value stack (the receipt) -------------------------------------
     What each part would normally cost. The total is added up from these
     rows at build time, so it can never disagree with the list above it.
     Adjust any figure here and the receipt and the total both follow.      */
  valueStack: [
    { item: "Professionally designed website", value: 500 },
    { item: "Domain name, first year", value: 15 },
    { item: "Hosting, first year", value: 120 },
    { item: "Business email and auto-replies", value: 90 },
    { item: "Written content for your pages", value: 150 },
    { item: "Enquiry form with instant email alerts", value: 100 },
    { item: "WhatsApp contact button", value: 40 },
    { item: "3 months of written content", value: 250 },
    { item: "Facebook page, set up and scheduled", value: 120 },
  ],

  /* --- Contact ---------------------------------------------------------- */
  email: "hello@web99.ie",
  location: "Dublin, Ireland",
  phone: "(01) 234 3300",
  /* Street, area, Eircode — split on ", " at build time for the address block
     and the JSON-LD PostalAddress, so it's only ever typed once. */
  address: "38 Fitzwilliam Square W, Dublin 2, D02 T938",

  /* --- Hero photograph --------------------------------------------------- */
  /* Drop the real photo at src/assets/img/hero.jpg and set heroImage below.
     Until then the hero renders its designed graphic panel instead.
     Brief: a real Irish business owner, 35-55, in their own workplace,
     looking at a phone, warm natural light, violet somewhere in frame.     */
  /* Currently a free Unsplash photo by André Reis (barbershop). It is a real
     workplace, but it shows a customer rather than the owner, and it is not
     Irish. Swap it for an owned photo of a real Irish customer at work — that
     is the single biggest upgrade available to this page. */
  heroImage: "/assets/img/hero-barber.webp",
  heroImageAlt: "A barber at work in his shop, finishing a customer's cut",
};
