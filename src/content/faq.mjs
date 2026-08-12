/* Questions written the way a nervous customer actually asks them.
   `home: true` = also shown on the front page. {{renewalPrice}} comes from site.config.mjs. */

export const faqs = [
  {
    home: true,
    q: "Do I really not pay anything to see it?",
    a: [
      "No. Nothing. We build a real preview of your website and email you the link within 48 hours. You look at it, show it to whoever you like, sleep on it.",
      "If you want it, you pay €99 and we finish and launch the real thing. If you don't, you do nothing and you owe nothing.",
    
    ],
  },
  {
    home: true,
    q: "What happens after the first year?",
    a: [
      "The €99 covers your first year completely — the design, the domain name, the hosting and your business email.",
      "After that, keeping the domain and hosting going is {{renewalPrice}}, and keeping the business email is {{emailRenewalPrice}}. That's the whole bill — nothing renews without you being told first, and if you'd rather leave, the site and domain are yours to take.",
    
    ],
  },
  {
    home: true,
    q: "What if I don't like it?",
    a: [
      "You pay nothing. Tell us what's wrong and we'll usually fix it — most things are a quick change to the preview.",
      "If it's still not for you, walk away. You were never charged and there's nothing to cancel.",
    
    ],
  },
  {
    home: true,
    q: "Do I own my website?",
    a: [
      "Yes. The domain is registered in your name, not ours. The files are yours.",
      "If you ever want to walk away, you take the lot with you. There is no contract tying you to us and we hold nothing back.",
    ],
  },
  {
    home: true,
    q: "What if I need to change something later?",
    a: [
      "Small updates — new opening hours, a new phone number, a price change, a spelling fix — are free forever. Not for the first year. Forever. Just message us.",
      "Bigger changes — moving things around, new colours, rewording a section — you get three rounds of those free after you pay. Beyond that, or for new pages and new content, we quote a fair fixed price before anything starts. Nothing is ever built and then billed.",
    
    ],
  },
  {
    home: true,
    q: "I'm not good with computers. Is this really for me?",
    a: [
      "This is built for people who'd rather not deal with computers at all.",
      "You don't install anything, learn anything or build anything. You talk — the way you'd talk to somebody standing in front of you in your shop — and we do the rest.",
    ],
  },
  {
    home: true,
    q: "How long does it actually take?",
    a: [
      "Two minutes of your time to tell us about your business. Within 48 hours you're looking at a real preview — before paying anything.",
      "Once you say yes, we send one short checklist to collect everything we need, and your finished site is live within 5 working days of your details arriving.",
    
    ],
  },
  {
    home: true,
    q: "Can you sell things on my website?",
    a: [
      "No — we don't build online shops, honestly and plainly. If taking card payments on your site is the main thing you need, we're not the right fit.",
      "What every site does have: a WhatsApp button and an enquiry form that reaches your email instantly, so customers can order or ask the way most Irish small businesses actually take orders — by message.",
    
    ],
  },
  {
    home: false,
    q: "What do you need from me to get started?",
    a: [
      "Your business name, what you do, and where you're based. That's enough to begin.",
      "If you have photos, a logo or opening hours to hand, send them along and we'll use them. If you don't, we'll build it without them and you can send them later.",
    ],
  },
  {
    home: false,
    q: "Can I use a domain name I already own?",
    a: [
      "Yes. If you already have a domain, we'll put your new website on it and you won't need the free one.",
      "Tell us the address when you get in touch and we'll sort it out.",
    ],
  },
  {
    home: false,
    q: "Will my website show up on Google?",
    a: [
      "We build it so Google can read it properly and we submit it once it goes live.",
      "We won't promise you the top spot — nobody honestly can. What we can promise is that when someone searches your business name, they'll find you.",
    ],
  },
  {
    home: false,
    q: "How do I pay the €99?",
    a: [
      "By card, after you've seen your preview and decided to go ahead. We send you a payment link — handled by Stripe, we never see your card details.",
      "One payment. No subscription, no direct debit, nothing that renews behind your back.",
    
    ],
  },
];
