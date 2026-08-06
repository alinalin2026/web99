/* Questions written the way a nervous customer actually asks them.
   `home: true` = also shown on the front page. {{renewalPrice}} comes from site.config.mjs. */

export const faqs = [
  {
    home: true,
    q: "Do I really not pay anything to see it?",
    a: [
      "No. Nothing. We build your website and email you the link. You look at it, show it to whoever you like, sleep on it.",
      "If you decide you want it, you pay €99. If you don't, you close the email and that's the end of it. We never ask for card details up front.",
    ],
  },
  {
    home: true,
    q: "What happens after the first year?",
    a: [
      "The €99 covers your first year completely — the design, the domain name and the hosting.",
      "After twelve months, keeping the domain and hosting running costs {{renewalPrice}}. That is the whole bill. There is nothing else, and we tell you the figure before you pay us a cent.",
      "If you'd rather move the website somewhere else at that point, you can. It's yours, and we'll help you move it.",
    ],
  },
  {
    home: true,
    q: "What if I don't like it?",
    a: [
      "You pay nothing. Tell us what's wrong and we'll usually fix it — most things are a quick change.",
      "But you are never obliged to. No invoice arrives. Nobody rings you.",
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
      "Message us and we'll change it. A new phone number, different opening hours, a few new photos — those take us minutes and we do them for you.",
      "If you'd rather make small edits yourself, we'll show you how. It takes about five minutes to learn.",
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
      "Two minutes of your time to tell us about your business. Then 24 hours for us to build it.",
      "You'll have the link the next day.",
    ],
  },
  {
    home: true,
    q: "Can you sell things on my website?",
    a: [
      "Yes. We can set up a shop that takes card payments, or a simple order form if that suits your business better.",
      "It's included in the €99. Tell us what you sell and we'll build it in.",
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
      "By card, after you've seen your website and said yes. We send you a payment link.",
      "One payment. No subscription, no direct debit, nothing that renews without you knowing.",
    ],
  },
];
