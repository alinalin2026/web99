# Web99.ie

The marketing site for Web99.ie — a Dublin design studio that builds a small
business a complete website for €99, and lets them see it finished and live
before paying anything.

Hand-written HTML and CSS. No framework, no component library, no runtime
dependencies. The whole site is about 400 KB including the hero photograph, and
the only JavaScript is one ~3 KB file.

---

## Editing the launch placeholders

**Everything you need to fill in lives in one file: `site.config.mjs`.**

| Value | What it is |
|---|---|
| `whatsappNumber` | The real WhatsApp number, digits only (`353871234567`) |
| `renewalPrice` | What year two actually costs — appears in the FAQ, pricing and terms |
| `counterValue` / `counterEnabled` | The live "businesses brought online" figure, and its on/off switch |
| `testimonials` | Real quotes only. Empty by default, which renders honest placeholder slots |
| `heroImage` | The hero photograph |
| `email`, `location` | Contact details |

Change a value, run `npm run build`, and it updates on every page at once.

## Running it

```bash
npm run build     # writes dist/
npm run serve     # builds, then serves dist/ at http://localhost:4173
npm run dev       # rebuilds whenever a source file changes
```

Node 18 or newer. There are no packages to install.

## How the build works

`build.mjs` stitches each file in `src/pages/` into `src/layout.html`, injects
the config, and writes plain static HTML to `dist/`.

```
src/
  layout.html          the page shell: meta, Open Graph, fonts
  partials/            header, footer, icon sprite, the decorative arcs
  pages/               one file per route, with its title/description on top
  content/faq.mjs      the FAQ, shared by the front page and /faq/
  content/included.mjs the twelve things the €99 buys
  content/examples.mjs the sample designs shown on the front page
  content/facebookExamples.mjs the sample Facebook pages on /facebook/
  assets/              css, js, images — copied to dist/ as-is
site.config.mjs        every placeholder value, in one place
```

Output is directory-per-route (`/pricing/index.html`), so it works unchanged on
GitHub Pages, Vercel, Netlify or any plain file server — no rewrite rules
needed. `sitemap.xml` and `robots.txt` are generated from the routes actually
built, so they can't drift.

## Deploying

- **GitHub Pages** — `.github/workflows/deploy-pages.yml` builds and publishes
  `dist/` on every push to `main`.
- **Vercel** — `vercel.json` is already set up (`node build.mjs` → `dist`).

## Routes

`/` · `/start/` · `/how-it-works/` · `/features/` · `/pricing/` · `/faq/` ·
`/facebook/` · `/contact/` · `/terms/` · `/privacy/` · plus a styled 404.

## Still to do before this takes real money

- [ ] Add the real WhatsApp number.
- [ ] Confirm the year-two renewal figure.
- [ ] Have a solicitor read `/terms/` and `/privacy/`. They are honest
      plain-English drafts written to match the offer, not vetted documents.
      Both carry a comment saying so.
- [ ] Wire up `/start/`. The markup and the submit hook are there — the form
      fires a `web99:story` event with the text and renders nothing yet.
      A chat interface drops into `#chatThread`.
- [ ] Replace the hero photograph. It is currently a free Unsplash photo by
      André Reis. It shows a real barber at work, but it is a customer rather
      than the owner, and it is not Irish. An owned photo of a real Irish
      customer is the single biggest upgrade available to this page.
- [ ] Replace the sample designs with real customer sites once there are
      some, with their permission. The four on the front page are demo
      builds and the copy says so — do not describe them as client work.
- [ ] Turn the counter on once the number is real. It is off-by-default in the
      sense that it reads `0` until you set it.

## Accessibility

Semantic headings with no skipped levels, one `h1` per page, alt text on every
image, a keyboard-operable accordion and menu, visible focus rings, and every
text/background pair meeting WCAG AA. Content is fully readable with
JavaScript disabled — the scroll animations only hide anything once JS has
confirmed it can show it again. Motion respects `prefers-reduced-motion`.
