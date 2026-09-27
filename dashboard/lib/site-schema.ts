/* ===========================================================================
   SITE SCHEMA
   ---------------------------------------------------------------------------
   The slot contract every instant-preview template reads. One shape, filled
   from quiz answers, rendered client-side with zero network round trips and
   zero AI calls. Category-specific templates (dashboard/templates/<category>)
   all take a Site and render it — they never hardcode business text.
   =========================================================================== */

export type SiteCategory =
  | "emergency"
  | "appointment"
  | "walkin"
  | "considered"
  | "product";

/** Categories with a real instant-preview template wired up in Phase 1+.
    Anything else in SiteCategory is a known future category that still
    routes to the existing Sarah hand-build flow. */
export const LIVE_TEMPLATE_CATEGORIES: SiteCategory[] = ["emergency", "appointment"];

export type PaletteId = "navy-amber" | "forest-cream" | "charcoal-red" | "slate-teal";
export type FontId = "bold" | "classic" | "friendly";

export interface SiteTheme {
  palette: PaletteId;
  font: FontId;
}

export interface SiteService {
  name: string;
  price?: string; // free text, e.g. "from €90" — optional per spec
}

export interface SiteLogo {
  type: "text" | "upload";
  url?: string; // present when type === "upload"
}

export interface SiteImages {
  hero: string; // path under /stock/<category>/... or an uploaded URL
}

export interface SiteCopy {
  /** All holes ({name} {trade} {town}) already filled by plain string replace. */
  headline: string;
  about?: string;
  ctaCall?: string;
  ctaWhatsapp?: string;
}

export interface Site {
  name: string;
  category: SiteCategory;
  trade: string;
  town: string;
  phone?: string; // optional — when present, template shows Call + WhatsApp buttons
  services: SiteService[];
  theme: SiteTheme;
  logo: SiteLogo;
  images: SiteImages;
  copy: SiteCopy;
}

export const PALETTES: Record<PaletteId, { bg: string; ink: string; accent: string; accentInk: string }> = {
  "navy-amber": { bg: "#0f1b33", ink: "#f4f6fb", accent: "#f5a623", accentInk: "#1a1204" },
  "forest-cream": { bg: "#1c2e22", ink: "#f6f4ea", accent: "#e7dcb8", accentInk: "#1c2e22" },
  "charcoal-red": { bg: "#1c1c1e", ink: "#f5f5f5", accent: "#e0483e", accentInk: "#ffffff" },
  "slate-teal": { bg: "#1a2b30", ink: "#eef6f5", accent: "#2fb6a3", accentInk: "#08211d" },
};

export const FONTS: Record<FontId, { heading: string; body: string }> = {
  bold: { heading: "'Archivo Black', system-ui, sans-serif", body: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" },
  classic: { heading: "Georgia, 'Times New Roman', serif", body: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" },
  friendly: { heading: "'Poppins', system-ui, sans-serif", body: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" },
};

/** Trade words with a matching tagged stock set under public/stock/<category>/. */
export const EMERGENCY_TRADES = ["plumber", "electrician", "locksmith"] as const;
export const APPOINTMENT_TRADES = ["handyman", "cleaner", "coach"] as const;

const STOCK_COUNT: Record<string, number> = {
  plumber: 4, electrician: 4, locksmith: 4, handyman: 4, cleaner: 4, coach: 4,
};

/** Deterministic pick from the tagged stock set — same trade always gets the
    same hero in a given preview session, but different previews spread
    across the set instead of all showing photo 01. */
export function heroImageFor(category: SiteCategory, trade: string, seed = 0): string {
  const dir = category === "appointment" ? "appointment" : "emergency";
  const count = STOCK_COUNT[trade] ?? 4;
  const n = (Math.abs(seed) % count) + 1;
  return `/stock/${dir}/${trade}-${String(n).padStart(2, "0")}.jpg`;
}

export function whatsappHref(phone: string, message: string): string {
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
