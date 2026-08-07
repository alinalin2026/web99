# Brand source files

Full-resolution originals of the new logo/brand set, kept here so they don't
only exist in a chat upload. What's actually deployed is derived from these
and lives in `src/assets/img/brand/` (favicon, header logo) — see that
folder's usage in `src/layout.html` and `src/partials/header.html`.

- `icon.png` — the mark alone. Source for the favicon and header logo
  (trimmed and resized into `src/assets/img/brand/`).
- `badge-circular.png` — the circular badge with the ring. Good source for a
  Facebook/Instagram profile picture (square-cropped-to-circle safe).
- `lockup-dark-glow.png` — horizontal lockup on a dark background. No slot on
  the site yet (it's light-themed) — candidate for a Telegram bot avatar or a
  dark-mode use if one gets added later.

## Needs fixing before use anywhere public

- `promo-banner-NEEDS-FIX.png` and `promo-hero-mockup-NEEDS-FIX.png` both say
  **"120+ businesses"**. The real, current figure is 57 (set in
  `site.config.mjs`). Don't use either as-is anywhere a customer sees it —
  regenerate with the correct number first.
- `promo-hero-mockup-NEEDS-FIX.png` additionally shows a **fake product
  screenshot** — generic nav ("About / Services"), generic headline ("Modern
  Websites That Grow Your Business"), buttons that don't exist on the real
  site. Using it as if it were a real screenshot would show customers a
  product that isn't the one they get. Either regenerate from an actual
  screenshot of web99.ie, or keep it as illustrative-only and label it so.
