/* What the €99 actually buys.
   `top: true` = shown immediately on the front page. The rest sit behind
   "See everything included". Order here is the order on the page. */

export const included = [
  /* --- shown immediately. The fastest possible read of:
         this is safe, this is fast, this is yours. ------------------------- */
  {
    top: true,
    icon: "i-eye",
    title: "See it before you buy",
    line: "No credit card to look. We build it, send you the link, and you decide then.",
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
    icon: "i-key",
    title: "You own the files and the domain",
    line: "Both in your name. Leave whenever you like, and take the lot with you.",
  },
  {
    top: true,
    icon: "i-clock",
    title: "Ready in 24 hours",
    line: 'Not two weeks. Not "we\'ll get back to you."',
  },
  {
    top: true,
    icon: "i-shield",
    title: "Don't love it? Walk away",
    line: "You were never charged. There's nothing to claim back and nobody to ring.",
  },

  /* --- the rest. Reasons to say yes once somebody is already leaning in. --- */
  {
    top: false,
    icon: "i-share",
    title: "Facebook page, 3 months of content",
    line: "We set up the page and write and schedule your posts for three months.",
    href: "/facebook/",
    hrefLabel: "See Facebook pages",
  },
  {
    top: false,
    icon: "i-phone",
    title: "No tech knowledge needed",
    line: "If you can send a text message, you can do this.",
  },
  {
    top: false,
    icon: "i-refresh",
    title: "Three changes after you pay",
    line: "Something not right? Tell us and we'll fix it. Three times, no charge.",
  },
  {
    top: false,
    icon: "i-chat",
    title: "Update your site from WhatsApp",
    line: "Need something changed later? Message us. No dashboard, no login, no learning anything.",
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
