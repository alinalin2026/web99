import { de } from "./locales/de";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import type { Dictionary, Lang } from "./types";

export const dictionaries: Record<Lang, Dictionary> = { en, fr, de, es };

export const languageNames: Record<Lang, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

export const languages = Object.keys(dictionaries) as Lang[];

export type { Dictionary, Lang, QuizQuestion, StoryContent } from "./types";
