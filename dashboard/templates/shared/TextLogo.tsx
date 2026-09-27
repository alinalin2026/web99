import { FONTS, PALETTES, type SiteTheme } from "@/lib/site-schema";

/** Fallback logo: the business name set in the chosen palette/font.
    Used whenever site.logo.type === "text" (no upload). */
export default function TextLogo({
  name,
  theme,
  size = 22,
}: {
  name: string;
  theme: SiteTheme;
  size?: number;
}) {
  const palette = PALETTES[theme.palette];
  const font = FONTS[theme.font];
  return (
    <span
      style={{
        fontFamily: font.heading,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: -0.3,
        color: palette.ink,
        lineHeight: 1.1,
      }}
    >
      {name}
    </span>
  );
}
