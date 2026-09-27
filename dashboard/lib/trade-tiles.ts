import type { SiteCategory } from "./site-schema";

export interface TradeTile {
  label: string;
  trade: string;
  category: SiteCategory;
  /** A real pre-built design (lib/donor-templates.ts) instead of the light
      site-schema render -- personalized by name/logo/phone only. */
  donorTemplate?: string;
}

/** "What do you do?" screen. Tiles with an instant preview (either the
    site-schema render, for emergency/appointment, or a donor template)
    route into the real quiz; everything else is a known category with no
    template yet, so it routes to the existing Sarah hand-build flow. */
export const TRADE_TILES: TradeTile[] = [
  { label: "Plumber", trade: "plumber", category: "emergency", donorTemplate: "d15-handyman" },
  { label: "Electrician", trade: "electrician", category: "emergency", donorTemplate: "kl-construction" },
  { label: "Locksmith", trade: "locksmith", category: "emergency", donorTemplate: "d15-handyman" },
  { label: "Handyman", trade: "handyman", category: "appointment", donorTemplate: "d15-handyman" },
  { label: "Cleaner", trade: "cleaner", category: "appointment", donorTemplate: "house-cleaning-dublin" },
  { label: "Coach / trainer", trade: "coach", category: "appointment", donorTemplate: "attridge-academy" },
  { label: "Shop or café", trade: "shop", category: "walkin", donorTemplate: "hot-tub-store" },
  { label: "Builder / renovation", trade: "builder", category: "considered", donorTemplate: "kl-construction" },
  { label: "Online shop", trade: "product", category: "product", donorTemplate: "westprint3d" },
  { label: "Something else", trade: "other", category: "considered" },
];

export function isTileLive(tile: TradeTile, liveCategories: readonly SiteCategory[]): boolean {
  return Boolean(tile.donorTemplate) || liveCategories.includes(tile.category);
}
