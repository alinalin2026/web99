import type { Dictionary } from "../types";

export const en: Dictionary = {
  meta: {
    title: "SunFlake Holidays | Bespoke Travel Matching",
    description:
      "SunFlake Holidays — we search, you travel, you relax. Bespoke holiday matching for discerning travelers, from alpine peaks to sunshine beaches.",
  },
  nav: {
    howItWorks: "How it works",
    quiz: "Take the quiz",
    stories: "Travel stories",
    contact: "Contact",
    cta: "Start your journey",
  },
  hero: {
    eyebrow: "Boutique travel concierge",
    title: "Snow peaks to sunshine beaches.",
    subtitle:
      "We search. You travel. You relax. Every traveler is unique — so is every journey we design for you.",
    ctaPrimary: "Take the quiz",
    ctaSecondary: "See how it works",
  },
  howItWorks: {
    title: "How it works",
    subtitle: "Three unhurried steps between you and your next escape.",
    steps: [
      {
        title: "Tell us your dream",
        body: "A few honest questions about how you actually like to travel — no forms that feel like a tax return.",
      },
      {
        title: "We search",
        body: "Our travel designers comb through boutique stays and hidden corners of the map that algorithms tend to miss.",
      },
      {
        title: "You travel, you relax",
        body: "A curated itinerary lands in your inbox, built around you — not a template with your name on it.",
      },
    ],
  },
  quiz: {
    title: "Find your match",
    subtitle:
      "Five quick questions. One honest answer at a time. We'll match you with the kind of escape that actually suits you.",
    start: "Start the quiz",
    questionWord: "Question",
    next: "Next",
    back: "Back",
    seeResult: "Reveal my match",
    restart: "Take it again",
    ctaContact: "Get my personalised itinerary",
    questions: [
      {
        id: "heart",
        prompt: "Where does your heart go first?",
        options: [
          { id: "a", label: "Straight up a mountain", weight: "alpine" },
          { id: "b", label: "Straight to the shoreline", weight: "coastal" },
          { id: "c", label: "Honestly, impossible to choose", weight: "both" },
        ],
      },
      {
        id: "soundtrack",
        prompt: "Pick a soundtrack for your holiday.",
        options: [
          { id: "a", label: "Wind through the pine trees", weight: "alpine" },
          { id: "b", label: "Waves on the shore", weight: "coastal" },
          { id: "c", label: "Both, on shuffle", weight: "both" },
        ],
      },
      {
        id: "afternoon",
        prompt: "Describe your ideal afternoon.",
        options: [
          { id: "a", label: "A hike with a view that earns the climb", weight: "alpine" },
          { id: "b", label: "A swim, then a very long nap", weight: "coastal" },
          { id: "c", label: "One of each, please", weight: "both" },
        ],
      },
      {
        id: "suitcase",
        prompt: "What's actually in your suitcase?",
        options: [
          { id: "a", label: "A wool jumper and proper boots", weight: "alpine" },
          { id: "b", label: "A swimsuit and factor 50", weight: "coastal" },
          { id: "c", label: "Layers for absolutely everything", weight: "both" },
        ],
      },
      {
        id: "evening",
        prompt: "How do you like your evenings?",
        options: [
          { id: "a", label: "Fireside, something warm in hand", weight: "alpine" },
          { id: "b", label: "Terrace, sunset, something cold in hand", weight: "coastal" },
          { id: "c", label: "Depends entirely on the night", weight: "both" },
        ],
      },
    ],
    results: {
      alpine: {
        title: "The Alpine Escape",
        body: "You're drawn to thin air and big views — cabins with wood stoves, trails that end at a ridge line, and evenings that feel earned. We'd start you in the mountains.",
      },
      coastal: {
        title: "The Coastal Escape",
        body: "You travel for the slow unclenching that only salt air brings — terraces, long lunches, and a horizon with nothing on the schedule. We'd start you by the water.",
      },
      both: {
        title: "Snow to Sand",
        body: "You don't want to choose, and honestly, neither would we in your position. One itinerary, two landscapes — alpine mornings and beach evenings in the same trip.",
      },
    },
  },
  stories: {
    sectionTitle: "Travel stories",
    sectionSubtitle: "A few of the journeys we've designed, told properly.",
    readMore: "Read the story",
    backToStories: "Back to travel stories",
    minuteRead: "min read",
    items: [
      {
        slug: "alps-cabin-escape",
        title: "A Week in the Alps: Mountain Cabin Escapes",
        excerpt:
          "Wood smoke, cowbells, and a cabin with a view that makes you stop mid-sentence. Notes from a week in the high valleys.",
        readTime: "4",
        body: [
          "The cabin sat just above the tree line, close enough to the village that fresh bread was a fifteen-minute walk and far enough that the only sound after dark was the stream below the deck. This is the version of the mountains most people don't get to see on a ski trip — the slow, green, high-summer version, when the peaks are still capped white but the meadows underneath them are thick with wildflowers.",
          "Mornings started early, not because anyone set an alarm but because the light came in sideways through the pine shutters and made staying in bed feel like a missed appointment. Coffee on the deck, a look at the ridge line, and a decision that mattered more than anything else that day: which trail. Most days it was the long way — up past the old dairy huts, along a path that had clearly been walked by cows longer than by hikers, to a ridge where the valley opened up in both directions.",
          "Evenings belonged to the wood stove and a bottle of something local, the kind of wine that never makes it onto an export list because there's barely enough of it for the village. We ate outside as long as the light allowed, then moved in when the cold came down off the peaks — and it always did, even in July. There's a particular kind of tired that comes from a full day outdoors and a full stomach, and it makes for the best sleep of the year.",
          "If you go: aim for the shoulder season, when the huts are open but the trails are quiet, and don't over-plan the days. The best afternoon of the whole week was the one we hadn't scheduled at all.",
        ],
      },
      {
        slug: "mediterranean-terrace",
        title: "Mediterranean Sunsets: Terrace Life on the Coast",
        excerpt:
          "White-washed walls, a terrace that catches the last of the light, and absolutely nowhere to be. Notes from the coast.",
        readTime: "4",
        body: [
          "The terrace faced west, which turned out to be the only decision that mattered. Everything else about the week arranged itself around that one fact — where to sit for lunch, when to swim, what time to start thinking about dinner — all of it built around being in that particular chair when the sun dropped into the water.",
          "The town itself was small enough to walk end to end before the coffee got cold, whitewashed and sun-bleached in a way that photographs never quite capture, because photographs can't carry the heat coming off the stone. Mornings were for the market — tomatoes that tasted like something, bread still warm, a fish stall with whatever had come in that night. Afternoons were for doing very little, on purpose, which took a few days to get used to.",
          "The sea itself was warm enough by mid-morning to swim without the customary sharp intake of breath, clear enough to see your feet at chest depth, and close enough that the walk back for a shower didn't feel like admitting defeat. Most days had exactly one plan in them, which was usually enough.",
          "If you go: book the terrace room even if it costs more. You are, in the end, paying for the light — and it is worth every cent of it.",
        ],
      },
      {
        slug: "snow-to-sand",
        title: "From Snow Peaks to Sunshine Beaches: One Itinerary, Two Worlds",
        excerpt:
          "For the travelers who refuse to choose between the mountains and the sea — because why should you have to?",
        readTime: "5",
        body: [
          "Every so often a traveler tells us they want the mountains and the coast in the same trip, and asks, slightly apologetically, if that's a strange request. It isn't. It's usually the best brief we get, because it forces the itinerary to actually earn its transitions instead of just filling days.",
          "The trick is in the order and the pacing, not the ambition. Start high: three or four days in the peaks first, while the legs are fresh and the cold still feels like a novelty rather than a chore. Long mornings on the trails, short evenings by the fire, and a gradual descent — literally — toward the coast, so the body has time to notice the air getting warmer and the light getting longer before the sea even comes into view.",
          "The middle stretch, the drive or the train down through the foothills, ends up being one of the best parts of the trip precisely because nobody plans for it. Vineyards where the mountains flatten out, a lunch stop in a town nobody's heard of, the first glimpse of water somewhere around a bend that makes the whole car go quiet for a second.",
          "Then the coast does what the coast does — slows everything down. The last three or four days are for the terrace, the swim, the long lunch, the sunset. By the end, the mountains feel like a different trip entirely, which is rather the point. One itinerary, two very different versions of doing nothing at all.",
        ],
      },
    ],
  },
  footer: {
    tagline: "We search. You travel. You relax.",
    contactTitle: "Tell us your dream",
    contactBody:
      "Take the quiz, or just write to us directly — a real person reads every message.",
    rights: "SunFlake Holidays. Bespoke travel matching.",
  },
  notFound: {
    title: "This trail doesn't lead anywhere",
    body: "The page you're looking for has wandered off. Let's get you back to the map.",
    cta: "Back to SunFlake",
  },
  common: {
    language: "Language",
  },
};
