export type Lang = "en" | "fr" | "de" | "es";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: { id: string; label: string; weight: "alpine" | "coastal" | "both" }[];
}

export interface StoryContent {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  readTime: string;
}

export interface Dictionary {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    howItWorks: string;
    quiz: string;
    stories: string;
    contact: string;
    cta: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: { title: string; body: string }[];
  };
  quiz: {
    title: string;
    subtitle: string;
    start: string;
    questionWord: string;
    next: string;
    back: string;
    seeResult: string;
    restart: string;
    ctaContact: string;
    questions: QuizQuestion[];
    results: {
      alpine: { title: string; body: string };
      coastal: { title: string; body: string };
      both: { title: string; body: string };
    };
  };
  stories: {
    sectionTitle: string;
    sectionSubtitle: string;
    readMore: string;
    backToStories: string;
    minuteRead: string;
    items: StoryContent[];
  };
  footer: {
    tagline: string;
    contactTitle: string;
    contactBody: string;
    rights: string;
  };
  notFound: {
    title: string;
    body: string;
    cta: string;
  };
  common: {
    language: string;
  };
}
