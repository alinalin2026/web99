/* What the €99 actually buys.
   `top: true` = shown immediately on the front page. The rest sit behind
   "See everything included". Order here is the order on the page. */

export const included = [
  /* --- shown immediately. The fastest possible read of:
         low risk, complete setup, easy to use, yours. -------------------- */
  {
    top: true,
    icon: "i-eye",
    title: "See it before you buy",
    line: "No credit card to look. We build a real preview of your website, send you the link, and you decide then.",
  },
  {
    top: true,
    icon: "i-pen",
    title: "Built around your business",
    line: "Not a template with your name dropped into it. Designed for what you actually do.",
  },
  {
    top: true,
    icon: "i-globe",
    title: "Free domain and hosting, first year",
    line: "Your own web address and everything it runs on. Included, not extra.",
  },
  {
    top: true,
    icon: "i-mail",
    title: "Business email, set up for you",
    line: "you@yourbusiness.ie, with an instant reply going out to every enquiry.",
  },
  {
    top: true,
    icon: "i-share",
    title: "Facebook page, 3 months of content",
    line: "We set up the page and write and schedule your posts for three months.",
    href: "/facebook/",
    hrefLabel: "See Facebook pages",
  },
  {
    top: true,
    icon: "i-phone",
    title: "No tech knowledge needed",
    line: "If you can send a text message, you can do this.",
  },
  {
    top: true,
    icon: "i-globe",
    title: "Built in any language",
    line: "English, Irish, or whatever your customers read in. We write and build the site itself in it — not just a translated template.",
  },
  {
    top: true,
    icon: "i-key",
    title: "You own the files and the domain",
    line: "Both in your name. Leave whenever you like, and take the lot with you.",
  },
  {
    top: true,
    icon: "i-clock",
    title: "Preview in 48 hours. Live in 5 working days",
    line: "You see a real preview within 48 hours. Once you say yes and send your details, your site is live within 5 working days.",
  },
  {
    top: true,
    icon: "i-refresh",
    title: "Small updates free, forever",
    line: "New opening hours, a new phone number, a price change, a typo — always free, for as long as you're with us. Not a trial. Policy.",
  },
  {
    top: true,
    icon: "i-shield",
    title: "Don't love it? Walk away",
    line: "You were never charged. There's nothing to claim back and nobody to ring.",
  },

  /* --- the rest. Reasons to say yes once somebody is already leaning in. --- */
  /* One bounded promise, not two. These were previously separate items and
     the WhatsApp one read as unlimited free edits forever, which is not what
     the €99 buys. Ongoing updates are a paid extra — see the upsell catalogue
     in dashboard/lib/capabilities.ts. */
  {
    top: false,
    icon: "i-refresh",
    title: "Three bigger changes free, by WhatsApp",
    line: "On top of the free small updates: three rounds of bigger changes — moving things, colours, rewording — free after you pay. Message us like you'd text anyone.",
  },
  {
    top: false,
    icon: "i-euro",
    title: "One payment. No contracts",
    line: "€99 once. No subscription, no direct debit, nothing that renews behind your back.",
  },
  {
    top: false,
    icon: "i-whatsapp",
    title: "WhatsApp button on your site",
    line: "One tap and the customer is talking to you.",
  },
];
