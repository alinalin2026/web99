import type { SiteCategory } from "./site-schema";

export interface TradeTile {
  label: string;
  trade: string;
  category: SiteCategory;
}

/** "What do you do?" screen. Tiles for emergency + appointment route into
    the real instant-preview quiz; everything else is a known category with
    no template yet, so it routes to the existing Sarah hand-build flow. */
export const TRADE_TILES: TradeTile[] = [
  { label: "Plumber", trade: "plumber", category: "emergency" },
  { label: "Electrician", trade: "electrician", category: "emergency" },
  { label: "Locksmith", trade: "locksmith", category: "emergency" },
  { label: "Handyman", trade: "handyman", category: "appointment" },
  { label: "Cleaner", trade: "cleaner", category: "appointment" },
  { label: "Coach / trainer", trade: "coach", category: "appointment" },
  { label: "Shop or café", trade: "shop", category: "walkin" },
  { label: "Builder / renovation", trade: "builder", category: "considered" },
  { label: "Online shop", trade: "product", category: "product" },
  { label: "Something else", trade: "other", category: "considered" },
];
