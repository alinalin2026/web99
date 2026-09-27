import { FONTS, PALETTES, telHref, whatsappHref, type Site } from "@/lib/site-schema";
import Logo from "../shared/Logo";

/* ===========================================================================
   APPOINTMENT TRADE TEMPLATE
   ---------------------------------------------------------------------------
   Book-a-slot trades (handyman, cleaner, coach). Design language: calm,
   trustworthy, no urgency banner — a light hero, service list with a
   "request a time" framing instead of call-out pricing.
   =========================================================================== */

export default function AppointmentTemplate({ site }: { site: Site }) {
  const palette = PALETTES[site.theme.palette];
  const font = FONTS[site.theme.font];
  const hasPhone = Boolean(site.phone);

  return (
    <div
      style={{
        background: palette.bg,
        color: palette.ink,
        fontFamily: font.body,
        minHeight: "100%",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          position: "sticky",
          top: 0,
          background: palette.bg,
          zIndex: 5,
          borderBottom: `1px solid rgba(255,255,255,.08)`,
        }}
      >
        <Logo name={site.name} logo={site.logo} theme={site.theme} />
        {hasPhone && (
          <a
            href={telHref(site.phone!)}
            style={{
              background: palette.accent,
              color: palette.accentInk,
              fontWeight: 800,
              fontSize: 14,
              padding: "10px 18px",
              borderRadius: 999,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {site.copy.ctaCall ?? "Call to book"}
          </a>
        )}
      </header>

      <section
        style={{
          position: "relative",
          padding: "56px 20px 44px",
          textAlign: "center",
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.45), ${palette.bg} 92%), url(${site.images.hero})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <h1
          style={{
            fontFamily: font.heading,
            fontSize: "clamp(28px, 7vw, 44px)",
            lineHeight: 1.1,
            margin: "0 0 14px",
            textWrap: "balance" as any,
          }}
        >
          {site.copy.headline}
        </h1>
        <p style={{ fontSize: 16, opacity: 0.85, margin: "0 0 26px" }}>
          Serving {site.town} and the surrounding area.
        </p>
        {hasPhone && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href={telHref(site.phone!)}
              style={{
                background: palette.accent,
                color: palette.accentInk,
                fontWeight: 800,
                fontSize: 16,
                padding: "14px 26px",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              {site.copy.ctaCall ?? "Call to book"} — {site.phone}
            </a>
            <a
              href={whatsappHref(site.phone!, `Hi, I'd like to book a ${site.trade} in ${site.town}`)}
              style={{
                background: "rgba(255,255,255,.1)",
                color: palette.ink,
                fontWeight: 700,
                fontSize: 16,
                padding: "14px 26px",
                borderRadius: 999,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,.25)",
              }}
            >
              WhatsApp to book
            </a>
          </div>
        )}
      </section>

      <section style={{ padding: "36px 20px", maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ fontFamily: font.heading, fontSize: 22, margin: "0 0 18px" }}>
          What {site.name} offers
        </h2>
        <div style={{ display: "grid", gap: 10 }}>
          {site.services.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              {s.price && (
                <span style={{ color: palette.accent, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {s.price}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: "36px 20px 56px",
          maxWidth: 640,
          margin: "0 auto",
          borderTop: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <h2 style={{ fontFamily: font.heading, fontSize: 20, margin: "0 0 10px" }}>
          About {site.name}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.85, margin: 0 }}>
          {site.copy.about ?? `${site.name} takes bookings in ${site.town} and the surrounding area.`}
        </p>
      </section>

      <footer style={{ padding: "22px 20px 90px", textAlign: "center", fontSize: 13, opacity: 0.6 }}>
        {site.name} · {site.town}
        {hasPhone ? ` · ${site.phone}` : ""}
      </footer>
    </div>
  );
}
