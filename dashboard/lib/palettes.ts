/* Curated colour palettes + font pairings for generated sites. Every text/background pairing the
   model is told to use is contrast-checked in test/palettes.test.mjs, so a page built from these can't
   end up with unreadable text. The model copies a palette's values exactly instead of inventing colours. */

export type PaletteMode = "light" | "soft" | "bold" | "dark";

export interface Palette {
  id: string;
  mode: PaletteMode;
  /** Google Fonts family names (heading, body) and the ONE <link> href that loads both. */
  heading: string;
  body: string;
  fontsHref: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  /** A deep band colour used for contrast sections and the footer, with its text colour. */
  dark: string;
  darkInk: string;
}

const gf = (families: string) => `https://fonts.googleapis.com/css2?${families}&display=swap`;

export const palettes: Palette[] = [
  { id: "fresh-green", mode: "light", heading: "DM Serif Display", body: "DM Sans", fontsHref: gf("family=DM+Serif+Display&family=DM+Sans:wght@400;500;700"), bg: "#FAFAF7", surface: "#FFFFFF", ink: "#16231C", muted: "#56635B", accent: "#2F7D4F", accentInk: "#FFFFFF", dark: "#163325", darkInk: "#F2F7F3" },
  { id: "sky-blue", mode: "light", heading: "Manrope", body: "Inter", fontsHref: gf("family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600"), bg: "#F7FAFD", surface: "#FFFFFF", ink: "#0F2137", muted: "#52657A", accent: "#1D6FD1", accentInk: "#FFFFFF", dark: "#0F2A4A", darkInk: "#EAF2FB" },
  { id: "warm-terracotta", mode: "light", heading: "Fraunces", body: "Inter", fontsHref: gf("family=Fraunces:wght@600;700&family=Inter:wght@400;500;600"), bg: "#FBF6F0", surface: "#FFFFFF", ink: "#2A1A12", muted: "#6A574C", accent: "#B9482A", accentInk: "#FFFFFF", dark: "#3A2015", darkInk: "#FBEFE6" },
  { id: "slate-amber", mode: "light", heading: "Barlow Condensed", body: "Barlow", fontsHref: gf("family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600"), bg: "#F8F8F6", surface: "#FFFFFF", ink: "#1B1F24", muted: "#5B6470", accent: "#C77700", accentInk: "#1B1F24", dark: "#1B222B", darkInk: "#F4F6F8" },
  { id: "clean-teal", mode: "light", heading: "Outfit", body: "Inter", fontsHref: gf("family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600"), bg: "#F5FAFA", surface: "#FFFFFF", ink: "#0E2A2E", muted: "#4F6B6F", accent: "#0B7A7A", accentInk: "#FFFFFF", dark: "#0C3336", darkInk: "#E8F6F6" },
  { id: "classic-navy", mode: "light", heading: "Playfair Display", body: "Source Sans 3", fontsHref: gf("family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600;700"), bg: "#FFFFFF", surface: "#F4F6FA", ink: "#111A2E", muted: "#55607A", accent: "#1F3A6E", accentInk: "#FFFFFF", dark: "#111A2E", darkInk: "#EDF1F9" },
  { id: "soft-blush", mode: "soft", heading: "Lora", body: "Nunito Sans", fontsHref: gf("family=Lora:wght@500;600;700&family=Nunito+Sans:wght@400;600;700"), bg: "#FDF5F3", surface: "#FFFFFF", ink: "#2E1F24", muted: "#6E5A61", accent: "#B5445E", accentInk: "#FFFFFF", dark: "#3B2229", darkInk: "#FCEDEF" },
  { id: "soft-sage", mode: "soft", heading: "Fraunces", body: "Nunito Sans", fontsHref: gf("family=Fraunces:wght@500;600;700&family=Nunito+Sans:wght@400;600;700"), bg: "#F6F7F2", surface: "#FFFFFF", ink: "#232A22", muted: "#5D665B", accent: "#5E7343", accentInk: "#FFFFFF", dark: "#2B3626", darkInk: "#F0F4EA" },
  { id: "soft-lavender", mode: "soft", heading: "Bricolage Grotesque", body: "Inter", fontsHref: gf("family=Bricolage+Grotesque:wght@500;600;700&family=Inter:wght@400;500;600"), bg: "#F8F6FC", surface: "#FFFFFF", ink: "#221B36", muted: "#625A7A", accent: "#6B4FD3", accentInk: "#FFFFFF", dark: "#2A2145", darkInk: "#F1EDFB" },
  { id: "bold-coral", mode: "bold", heading: "Poppins", body: "Inter", fontsHref: gf("family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600"), bg: "#FFF8F2", surface: "#FFFFFF", ink: "#1E1B2E", muted: "#5A5670", accent: "#D92D4A", accentInk: "#FFFFFF", dark: "#1E1B2E", darkInk: "#FFF1F3" },
  { id: "bold-orange", mode: "bold", heading: "Barlow Condensed", body: "Barlow", fontsHref: gf("family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600"), bg: "#FFFFFF", surface: "#F5F5F2", ink: "#111111", muted: "#555555", accent: "#E5580C", accentInk: "#111111", dark: "#111111", darkInk: "#FFFFFF" },
  { id: "bold-electric", mode: "bold", heading: "Space Grotesk", body: "Inter", fontsHref: gf("family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600"), bg: "#F6F7FF", surface: "#FFFFFF", ink: "#0B0F2B", muted: "#50557A", accent: "#3B37F0", accentInk: "#FFFFFF", dark: "#0B0F2B", darkInk: "#EEF0FF" },
  { id: "dark-emerald", mode: "dark", heading: "Sora", body: "Inter", fontsHref: gf("family=Sora:wght@600;700&family=Inter:wght@400;500;600"), bg: "#0B1210", surface: "#121C18", ink: "#F1F7F4", muted: "#A3B5AC", accent: "#4ADE80", accentInk: "#06210F", dark: "#060B09", darkInk: "#F1F7F4" },
  { id: "dark-gold", mode: "dark", heading: "Playfair Display", body: "Inter", fontsHref: gf("family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600"), bg: "#0E0E10", surface: "#17171A", ink: "#F5F1E8", muted: "#B0A899", accent: "#D4A24C", accentInk: "#17130A", dark: "#08080A", darkInk: "#F5F1E8" },
  { id: "dark-blue", mode: "dark", heading: "Manrope", body: "Inter", fontsHref: gf("family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600"), bg: "#0A1220", surface: "#111C31", ink: "#EEF3FB", muted: "#9FB0C8", accent: "#5AA9FF", accentInk: "#06182F", dark: "#060C17", darkInk: "#EEF3FB" },
];

/** Palette modes each "Try another version" style may use. */
export const STYLE_MODES: Record<string, PaletteMode[]> = {
  lighter: ["light", "soft"],
  darker: ["dark"],
  bolder: ["bold"],
  softer: ["soft"],
  photos: ["light", "soft"],
};

export function paletteById(id: string | null | undefined): Palette | undefined {
  return palettes.find((p) => p.id === id);
}

/** Choose a palette for a requested style, avoiding ones the customer has already seen. */
export function pickPalette(style: string, seen: string[] = [], rnd: () => number = Math.random): Palette {
  const modes = STYLE_MODES[style] ?? ["light", "soft", "bold"];
  const inMode = palettes.filter((p) => modes.includes(p.mode));
  const fresh = inMode.filter((p) => !seen.includes(p.id));
  const pool = fresh.length ? fresh : inMode;
  return pool[Math.floor(rnd() * pool.length)];
}

export function paletteRow(p: Palette): string {
  return `${p.id} [${p.mode}] — headings '${p.heading}', body '${p.body}' — fonts <link href="${p.fontsHref}"> — --bg:${p.bg}; --surface:${p.surface}; --ink:${p.ink}; --muted:${p.muted}; --accent:${p.accent}; --accent-ink:${p.accentInk}; --dark:${p.dark}; --dark-ink:${p.darkInk}`;
}

/** The palette section of the prompt. With `forced`, the model has no choice; otherwise it picks one. */
export function paletteInstructions(forced?: Palette): string {
  const rules = `Define the palette's values EXACTLY as CSS custom properties on :root and load its fonts with exactly the <link> given (no other font links). Text on --bg or --surface uses --ink (or --muted for secondary text); text on --accent (buttons, badges) uses --accent-ink; text on --dark bands and the footer uses --dark-ink; never invent other colour pairings for text. You may add ONE soft tint mixed from --accent for backgrounds (text on it uses --ink) and one subtle border colour. Put data-palette="PALETTE-ID" on the <body> tag.`;
  if (forced) return `COLOUR & FONTS — use THIS palette, no other:\n${paletteRow(forced)}\n${rules}`;
  const rows = palettes.map(paletteRow).join("\n");
  return `COLOUR & FONTS — pick exactly ONE of these palettes that suits the trade. Prefer a [light] or [soft] palette; use [dark] only where the trade truly suits it (barber, nightlife, luxury, cinema, tattoo); [bold] suits energetic trades.\n${rows}\n${rules}`;
}
