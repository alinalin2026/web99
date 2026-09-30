/* Questions written the way a nervous customer actually asks them.
   `home: true` = also shown on the front page. {{renewalPrice}} comes from site.config.mjs. */

export const faqs = [
  {
    home: true,
    q: "Do I really not pay anything to see it?",
    a: [
      "No. Nothing. While you chat with Sarah, the design of your website builds live in front of you — the colours, the layout, the feel of it. No card, no waiting.",
      "If you like the look, you pay €99, send us your details, and we finish and launch the real thing with your photos and imagery. If you don't, you close the chat and you owe nothing.",
    
    ],
  },
  {
    home: true,
    q: "What happens after the first year?",
    a: [
      "The €99 covers your first year completely — the design, the domain name and the hosting.",
      "After that, keeping the domain and hosting going is {{renewalPrice}}. That's the whole bill — nothing renews without you being told first, and if you'd rather leave, the site and domain are yours to take.",

    ],
  },
  {
    home: true,
    q: "What if I don't like it?",
    a: [
      "You pay nothing. Tell Sarah what's wrong — a different colour, a different feel — and we'll take it on board. The preview is only the starting point for the look.",
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
      "Two minutes of your time to tell us about your business, and you see the design of your website right there in the chat — before paying anything.",
      "Once you pay, you fill in one short checklist with your photos, logo and details. We add the imagery and everything else, and your finished site is live within 5 working days of your details arriving.",
    
    ],
  },
  {
    home: true,
    q: "Can you sell things on my website?",
    a: [
      "Yes, we can — but an online shop is a custom job, so it gets its own custom quote rather than being part of the €99 website. Tell Sarah what you want to sell and someone from our team will come back to you by email.",
      "Every €99 site already has a WhatsApp button and an enquiry form that reaches you instantly, so customers can order or ask by message — the way most Irish small businesses take orders.",
    
    ],
  },
  {
    home: false,
    q: "What do you need from me to get started?",
    a: [
      "Your business name, what you do, and where you're based. That's enough to see your design.",
      "Photos, a logo, opening hours and the rest come after you pay, in one short checklist. No photos? We add the imagery for you.",
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
      "By card, after you've seen your design and decided to go ahead. You get a payment link — handled by Stripe, we never see your card details.",
      "One payment. No subscription, no direct debit, nothing that renews behind your back.",
    
    ],
  },
];
