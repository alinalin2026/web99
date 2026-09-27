import type { SiteCategory } from "./site-schema";

export interface TradeTile {
  label: string;
  trade: string;
  category: SiteCategory;
  /** Sources the services/features section -- real pre-built content (see
      lib/composed-templates.ts), kept topically matched to the trade. */
  contentDonor?: string;
  /** Sources header nav + hero + footer -- deliberately a *different* donor
      than contentDonor, so the preview doesn't read as "that's just
      [donor]'s actual site with a new name" (see composed-templates.ts). */
  chromeDonor?: string;
}

/** "What do you do?" screen. Tiles with both donors set get an instant
    preview assembled from real pre-built sections; everything else is a
    known category with no template yet, so it routes to the existing Sarah
    hand-build flow. */
/* Chrome (header/hero/footer) carries real marketing copy from its donor's
   actual business, not just a generic look -- e.g. D15's hero subtitle
   reads "Friendly, dependable handyman and pressure washing services...".
   Pairing chrome across unrelated topic clusters reads as visibly wrong,
   not just "a bit off" (hot-tub-store's "Crystal-Clear Water, Every Time"
   showing up on a locksmith's page, house-cleaning-dublin's "Build my
   clean" on an electrician's) -- confirmed by actually screenshotting it.
   So chrome stays within the same rough cluster as content:
   trades (kl-construction, d15-handyman) / retail (westprint3d,
   hot-tub-store) / cleaning+trades (close enough: "pressure washing" is a
   real overlap). Attridge Academy (education) has no cluster-mate, so its
   pairing is the one spot where a residual copy mismatch is unavoidable
   with this donor pool. */
export const TRADE_TILES: TradeTile[] = [
  { label: "Plumber", trade: "plumber", category: "emergency", contentDonor: "d15-handyman", chromeDonor: "kl-construction" },
  { label: "Electrician", trade: "electrician", category: "emergency", contentDonor: "kl-construction", chromeDonor: "d15-handyman" },
  { label: "Locksmith", trade: "locksmith", category: "emergency", contentDonor: "d15-handyman", chromeDonor: "kl-construction" },
  { label: "Handyman", trade: "handyman", category: "appointment", contentDonor: "d15-handyman", chromeDonor: "kl-construction" },
  { label: "Cleaner", trade: "cleaner", category: "appointment", contentDonor: "house-cleaning-dublin", chromeDonor: "d15-handyman" },
  { label: "Coach / trainer", trade: "coach", category: "appointment", contentDonor: "attridge-academy", chromeDonor: "d15-handyman" },
  { label: "Shop or café", trade: "shop", category: "walkin", contentDonor: "hot-tub-store", chromeDonor: "westprint3d" },
  { label: "Builder / renovation", trade: "builder", category: "considered", contentDonor: "kl-construction", chromeDonor: "d15-handyman" },
  { label: "Online shop", trade: "product", category: "product", contentDonor: "westprint3d", chromeDonor: "hot-tub-store" },
  { label: "Something else", trade: "other", category: "considered" },
];

export function isTileLive(tile: TradeTile, liveCategories: readonly SiteCategory[]): boolean {
  return Boolean(tile.contentDonor && tile.chromeDonor) || liveCategories.includes(tile.category);
}
