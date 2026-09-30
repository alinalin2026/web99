/* Renders a SiteContent + SiteDesign into a complete, self-contained HTML page.

   All text is HTML-escaped here, all layout/CSS is fixed and tested (see test/site-render.test.mjs and the
   combination sweep in the repo docs), and colours come only from a contrast-checked palette. Nothing the
   model wrote is ever interpreted as markup. */
import { iconSvg } from "./icons";
import { paletteById, type Palette } from "./palettes";
import type { SiteContent, SiteDesign, Variants } from "./site-blocks";

export interface RenderPhoto { url: string; alt: string }
export type RenderPhotos = Partial<Record<"hero" | "work" | "detail", RenderPhoto>>;

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* ---------- contrast helpers ---------- */

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/* ---------- CSS ---------- */

function css(p: Palette): string {
  // Accent only where it is readable: on a dark band we fall back to the band's text colour.
  const accentOnDark = contrast(p.accent, p.dark) >= 4.5 ? p.accent : p.darkInk;
  const eyebrow = contrast(p.accent, p.bg) >= 4.5 ? p.accent : p.ink;
  const mood = p.mode;
  const radius = mood === "bold" ? "6px" : mood === "soft" ? "24px" : "14px";
  const btnRadius = mood === "bold" ? "6px" : "999px";
  const shadow = mood === "bold" ? "none" : mood === "dark" ? "0 10px 30px rgba(0,0,0,.35)" : "0 10px 30px rgba(20,24,40,.08)";
  const border = mood === "bold" ? "2px solid var(--ink)" : "1px solid var(--line)";
  return `
:root{--bg:${p.bg};--surface:${p.surface};--ink:${p.ink};--muted:${p.muted};--accent:${p.accent};--accent-ink:${p.accentInk};--dark:${p.dark};--dark-ink:${p.darkInk};--accent-on-dark:${accentOnDark};--eyebrow:${eyebrow};
--tint:color-mix(in srgb,var(--accent) 11%,var(--bg));--line:color-mix(in srgb,var(--ink) 13%,transparent);
--r:${radius};--btn-r:${btnRadius};--shadow:${shadow};--card-border:${border};--fh:'${p.heading}',Georgia,serif;--fb:'${p.body}',system-ui,-apple-system,'Segoe UI',sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.6 var(--fb);-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:var(--fh);line-height:1.12;margin:0 0 .5em;letter-spacing:-.012em;font-weight:700;overflow-wrap:break-word}
h1{font-size:clamp(2.2rem,5.2vw,3.9rem)}h2{font-size:clamp(1.75rem,3.5vw,2.6rem)}h3{font-size:1.18rem}
p{margin:0 0 1em}img{display:block;max-width:100%}a{color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:0 clamp(20px,4vw,40px)}
section{padding:clamp(56px,8vw,104px) 0}
[id]{scroll-margin-top:84px}
.eyebrow{display:block;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--eyebrow);margin-bottom:14px}
.lede{color:var(--muted);font-size:1.1rem;max-width:62ch}
.sec-head{max-width:720px;margin-bottom:clamp(28px,4vw,48px)}
.sec-head.center{margin-left:auto;margin-right:auto;text-align:center}.sec-head.center .lede{margin-left:auto;margin-right:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;padding:.85em 1.5em;border-radius:var(--btn-r);background:var(--accent);color:var(--accent-ink);font:700 .98rem var(--fb);text-decoration:none;border:2px solid var(--accent);cursor:pointer;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-1px);box-shadow:var(--shadow)}
.btn--ghost{background:transparent;color:inherit;border-color:color-mix(in srgb,currentColor 35%,transparent)}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 22px}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:0;padding:0;list-style:none}
.chips li{display:inline-flex;align-items:center;gap:8px;font-size:.88rem;font-weight:600;padding:8px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--line)}
.chips .ic{width:1.1em;height:1.1em;color:var(--accent)}
.on-dark{background:var(--dark);color:var(--dark-ink)}.on-dark .lede,.on-dark p{color:color-mix(in srgb,var(--dark-ink) 80%,transparent)}.on-dark .eyebrow,.on-dark .ic{color:var(--accent-on-dark)}
.on-dark .chips li{background:color-mix(in srgb,var(--dark-ink) 10%,transparent);border-color:color-mix(in srgb,var(--dark-ink) 22%,transparent);color:var(--dark-ink)}
.on-accent{background:var(--accent);color:var(--accent-ink)}.on-accent .lede,.on-accent p{color:color-mix(in srgb,var(--accent-ink) 88%,transparent)}.on-accent .eyebrow,.on-accent .ic{color:var(--accent-ink)}
.on-accent .btn{background:var(--accent-ink);color:var(--accent);border-color:var(--accent-ink)}.on-accent .btn--ghost{background:transparent;color:var(--accent-ink);border-color:color-mix(in srgb,var(--accent-ink) 55%,transparent)}
.ic{width:1.5em;height:1.5em;flex:none}
.badge{display:inline-grid;place-items:center;width:52px;height:52px;border-radius:calc(var(--r) * .8);background:var(--tint);color:var(--accent);margin-bottom:16px}.badge .ic{width:26px;height:26px}
.card{background:var(--surface);border:var(--card-border);border-radius:var(--r);box-shadow:var(--shadow);padding:clamp(20px,2.4vw,30px)}
.card p:last-child,.card h3:last-child{margin-bottom:0}.card p{color:var(--muted);font-size:.97rem}
.photo{margin:0;border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow);border:var(--card-border);background:var(--tint)}.photo img{width:100%;height:100%;object-fit:cover;aspect-ratio:3/2}

/* header */
.hdr{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--line)}
.hdr .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:68px}
.logo{font:700 1.25rem var(--fh);text-decoration:none;letter-spacing:-.01em}.logo b{color:var(--accent)}
.nav{display:flex;gap:26px;align-items:center}.nav a{text-decoration:none;font-size:.93rem;font-weight:600;color:var(--muted)}.nav a:hover{color:var(--ink)}
.hdr--center .wrap{flex-wrap:wrap;justify-content:center;padding-top:12px;padding-bottom:12px}.hdr--center .logo{flex:1 1 100%;text-align:center}.hdr--center .btn{display:none}
@media(max-width:860px){.nav{display:none}.hdr--center .wrap{justify-content:space-between}.hdr--center .logo{flex:0 1 auto;text-align:left}.hdr--center .btn{display:inline-flex}}

/* hero */
.hero{padding:clamp(48px,7vw,96px) 0}
.hero__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,64px);align-items:center}
.hero--flip .hero__grid{grid-template-columns:1fr 1fr}.hero--flip .hero__photo{order:-1}
.hero h1{margin-bottom:.4em}.hero__sub{font-size:1.15rem;color:var(--muted);max-width:54ch}
.hero__photo{transform:none}.hero__photo img{aspect-ratio:4/3.3}
.hero--centered{text-align:center}.hero--centered .hero__sub{margin-left:auto;margin-right:auto}.hero--centered .actions,.hero--centered .chips{justify-content:center}
.hero--centered .hero__band{margin-top:clamp(28px,4vw,48px)}.hero--centered .hero__band img{aspect-ratio:21/8}
.hero--full{position:relative;isolation:isolate;min-height:min(78vh,720px);display:flex;align-items:center;color:var(--dark-ink)}
.hero--full .hero__bg{position:absolute;inset:0;z-index:-2}.hero--full .hero__bg img{width:100%;height:100%;object-fit:cover}
.hero--full::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,color-mix(in srgb,var(--dark) 94%,transparent) 0%,color-mix(in srgb,var(--dark) 80%,transparent) 42%,color-mix(in srgb,var(--dark) 18%,transparent) 100%)}
.hero--full .hero__sub{color:color-mix(in srgb,var(--dark-ink) 88%,transparent)}.hero--full .eyebrow,.hero--full .chips .ic{color:var(--accent-on-dark)}
.hero--full .chips li{background:color-mix(in srgb,var(--dark-ink) 12%,transparent);border-color:color-mix(in srgb,var(--dark-ink) 26%,transparent);color:var(--dark-ink)}
.hero--full .btn--ghost{color:var(--dark-ink)}.hero--full .hero__text{max-width:660px}
.hero--bold{background:var(--accent);color:var(--accent-ink)}.hero--bold .hero__grid{grid-template-columns:1.2fr .8fr}.hero--bold h1{text-transform:uppercase;font-size:clamp(2rem,4.6vw,3.7rem);line-height:1.04}
.hero--bold .hero__sub{color:color-mix(in srgb,var(--accent-ink) 88%,transparent)}.hero--bold .eyebrow,.hero--bold .chips .ic{color:var(--accent-ink)}
.hero--bold .btn{background:var(--accent-ink);color:var(--accent);border-color:var(--accent-ink)}.hero--bold .btn--ghost{background:transparent;color:var(--accent-ink);border-color:color-mix(in srgb,var(--accent-ink) 55%,transparent)}
.hero--bold .chips li{background:color-mix(in srgb,var(--accent-ink) 10%,transparent);border-color:color-mix(in srgb,var(--accent-ink) 30%,transparent);color:var(--accent-ink)}
.hero--bold .hero__photo{border:4px solid var(--accent-ink);box-shadow:10px 10px 0 color-mix(in srgb,var(--accent-ink) 85%,transparent)}
@media(max-width:860px){.hero__grid,.hero--flip .hero__grid,.hero--bold .hero__grid{grid-template-columns:1fr}.hero--flip .hero__photo{order:0}.hero--full{min-height:0;padding:72px 0}.hero--full::before{background:color-mix(in srgb,var(--dark) 82%,transparent)}}

/* services */
.grid{display:grid;gap:clamp(16px,2vw,26px)}
.services--cards .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr))}
.services--cards .card h3,.services--tiles .tile h3{margin-bottom:.4em}
.services--tiles .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr))}
.tile{background:var(--tint);border-radius:var(--r);padding:clamp(22px,2.6vw,32px);border:1px solid transparent}.tile .ic{width:34px;height:34px;color:var(--accent);margin-bottom:18px}.tile p{color:var(--muted);font-size:.97rem;margin:0}
.services--list .grid{grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:0 clamp(28px,5vw,64px)}
.row{display:flex;gap:18px;padding:22px 0;border-bottom:1px solid var(--line)}.row .badge{margin:0;flex:none}.row h3{margin-bottom:.25em}.row p{margin:0;color:var(--muted);font-size:.97rem}
.services--feature .feature{display:grid;grid-template-columns:.8fr 1.4fr;gap:clamp(28px,5vw,72px);align-items:start}.services--feature .sec-head{position:sticky;top:110px;margin:0}
.services--feature .stack{display:grid;gap:14px}.stack .card{display:flex;gap:18px;align-items:flex-start}.stack .card .badge{margin:0}
@media(max-width:860px){.services--feature .feature{grid-template-columns:1fr}.services--feature .sec-head{position:static;margin-bottom:28px}.services--list .grid{grid-template-columns:1fr}}

/* values */
.values{padding:clamp(48px,6vw,80px) 0}.values .sec-head{margin-bottom:clamp(24px,3vw,40px)}
.vgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:clamp(20px,3vw,40px)}
.vitem .ic{width:32px;height:32px;margin-bottom:14px}.vitem h3{margin-bottom:.35em}.vitem p{margin:0;font-size:.96rem}
.values--light{background:var(--surface);border-block:1px solid var(--line)}.values--light .vitem .ic{color:var(--accent)}.values--light .vitem p{color:var(--muted)}

/* process */
.process--cards .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:clamp(16px,2vw,24px);counter-reset:s}
.step{counter-increment:s}.step__n{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font:700 1.05rem var(--fh);margin-bottom:16px}
.step::before{content:none}.step h3{margin-bottom:.3em}.step p{margin:0;color:var(--muted);font-size:.96rem}
.process--timeline .steps{max-width:760px;position:relative;display:grid;gap:30px;padding-left:0}
.process--timeline .step{display:grid;grid-template-columns:44px 1fr;gap:20px;position:relative}.process--timeline .step__n{margin:0;position:relative;z-index:1}
.process--timeline .step:not(:last-child)::after{content:"";position:absolute;left:21px;top:46px;bottom:-30px;width:2px;background:var(--line)}
.process--steps .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;position:relative}
.process--steps .step{position:relative;padding-top:6px}.process--steps .step:not(:last-child)::after{content:"";position:absolute;top:28px;left:56px;right:-12px;height:2px;background:var(--line)}
@media(max-width:860px){.process--steps .step:not(:last-child)::after{display:none}}
.process--cards .step{background:var(--surface);border:var(--card-border);border-radius:var(--r);padding:24px;box-shadow:var(--shadow)}

/* about */
.about__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,72px);align-items:center}
.about--photo-right .about__photo{order:2}
.about__text p{color:var(--muted)}
.ticks{list-style:none;margin:22px 0 0;padding:0;display:grid;gap:10px}.ticks li{display:flex;gap:12px;align-items:flex-start;font-weight:600}.ticks .ic{width:1.3em;height:1.3em;color:var(--accent);margin-top:.1em}
.about--centered .about__text{max-width:760px;margin:0 auto;text-align:center}.about--centered .actions{justify-content:center}.about--centered .ticks{justify-content:center;justify-items:center}
.about--centered .about__band{margin-top:clamp(28px,4vw,48px)}.about--centered .about__band img{aspect-ratio:21/8}
@media(max-width:860px){.about__grid{grid-template-columns:1fr}.about--photo-right .about__photo{order:0}}

/* faq */
details{background:var(--surface);border:var(--card-border);border-radius:var(--r);margin-bottom:12px;overflow:hidden}
summary{list-style:none;cursor:pointer;padding:20px 24px;font:700 1.03rem var(--fb);display:flex;justify-content:space-between;gap:16px;align-items:center}
summary::-webkit-details-marker{display:none}summary::after{content:"+";font:400 1.6rem/1 var(--fb);color:var(--accent);flex:none}details[open] summary::after{content:"–"}
details p{padding:0 24px 22px;margin:0;color:var(--muted)}
.faq--accordion .list{max-width:820px;margin:0 auto}
.faq--two-col .faq__grid{display:grid;grid-template-columns:.8fr 1.4fr;gap:clamp(28px,5vw,72px);align-items:start}.faq--two-col .sec-head{margin:0;position:sticky;top:110px}
@media(max-width:860px){.faq--two-col .faq__grid{grid-template-columns:1fr}.faq--two-col .sec-head{position:static;margin-bottom:24px}}

/* cta / contact */
.cta{text-align:center}.cta .wrap{max-width:860px}.cta h2{font-size:clamp(1.9rem,4vw,3rem)}.cta .actions{justify-content:center}
.cta--photo{position:relative;isolation:isolate;text-align:left;color:var(--dark-ink)}.cta--photo .cta__bg{position:absolute;inset:0;z-index:-2}.cta--photo .cta__bg img{width:100%;height:100%;object-fit:cover}
.cta--photo::before{content:"";position:absolute;inset:0;z-index:-1;background:color-mix(in srgb,var(--dark) 86%,transparent)}.cta--photo .cta__in{max-width:640px}.cta--photo .actions{justify-content:flex-start}
.cta--photo p{color:color-mix(in srgb,var(--dark-ink) 86%,transparent)}.cta--photo .btn--ghost{color:var(--dark-ink)}
.contact-list{display:flex;flex-wrap:wrap;gap:12px 28px;justify-content:center;list-style:none;margin:8px 0 0;padding:0;font-weight:600}.cta--photo .contact-list{justify-content:flex-start}
.contact-list li{display:flex;gap:10px;align-items:center}.contact-list a{text-decoration:none;border-bottom:1px solid currentColor}.contact-list .ic{width:1.2em;height:1.2em}

/* footer */
.ftr{padding:clamp(40px,5vw,64px) 0 28px;background:var(--dark);color:var(--dark-ink);font-size:.93rem}.ftr p{color:color-mix(in srgb,var(--dark-ink) 75%,transparent);margin:0}
.ftr a{text-decoration:none;color:color-mix(in srgb,var(--dark-ink) 85%,transparent)}.ftr a:hover{color:var(--dark-ink)}
.ftr__simple{display:flex;flex-wrap:wrap;gap:16px 40px;align-items:center;justify-content:space-between}
.ftr__cols{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:32px}.ftr h3{font:700 .8rem var(--fb);letter-spacing:.12em;text-transform:uppercase;color:var(--dark-ink);margin:0 0 14px}
.ftr ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}.ftr .logo{color:var(--dark-ink);display:inline-block;margin-bottom:10px}
.ftr__copy{margin-top:32px;padding-top:20px;border-top:1px solid color-mix(in srgb,var(--dark-ink) 16%,transparent);font-size:.82rem}
@media(max-width:860px){.ftr__cols{grid-template-columns:1fr}}
`;
}

/* ---------- html helpers ---------- */

const img = (p: RenderPhoto | undefined, cls = "", eager = false) => (p ? `<img${cls ? ` class="${cls}"` : ""} src="${esc(p.url)}" alt="${esc(p.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">` : "");
const figure = (p: RenderPhoto | undefined, cls: string, eager = false) => (p ? `<figure class="photo ${cls}">${img(p, "", eager)}</figure>` : "");
const icon = (name: string) => iconSvg(name);
const badge = (name: string) => `<span class="badge">${icon(name)}</span>`;
const head = (eyebrow: string, title: string, intro = "", center = false) =>
  `<div class="sec-head${center ? " center" : ""}">${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}<h2>${esc(title)}</h2>${intro ? `<p class="lede">${esc(intro)}</p>` : ""}</div>`;

const NAV: [string, string][] = [["#services", "Services"], ["#process", "How it works"], ["#about", "About"], ["#faq", "FAQ"], ["#contact", "Contact"]];

function header(c: SiteContent, v: Variants): string {
  const name = esc(c.brand.name);
  return `<header class="hdr hdr--${v.header}"><div class="wrap"><a class="logo" href="#top">${name}</a><nav class="nav" aria-label="Main">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</nav><a class="btn" href="#contact">${esc(c.hero.primaryCta)}</a></div></header>`;
}

function hero(c: SiteContent, v: Variants, ph: RenderPhotos): string {
  const h = c.hero;
  const text = `${h.eyebrow ? `<span class="eyebrow">${esc(h.eyebrow)}</span>` : ""}<h1>${esc(h.headline)}</h1><p class="hero__sub">${esc(h.sub)}</p><div class="actions"><a class="btn" href="#contact">${esc(h.primaryCta)}</a><a class="btn btn--ghost" href="#services">${esc(h.secondaryCta)}</a></div>${h.chips.length ? `<ul class="chips">${h.chips.map((x, i) => `<li>${icon(["clock", "shield-check", "heart"][i % 3])}${esc(x)}</li>`).join("")}</ul>` : ""}`;
  const photo = ph.hero;
  switch (v.hero) {
    case "full":
      return `<section class="hero hero--full" id="top"><div class="hero__bg">${img(photo, "", true)}</div><div class="wrap"><div class="hero__text">${text}</div></div></section>`;
    case "centered":
      return `<section class="hero hero--centered" id="top"><div class="wrap">${text}${photo ? figure(photo, "hero__band", true) : ""}</div></section>`;
    case "bold":
      return `<section class="hero hero--bold" id="top"><div class="wrap"><div class="hero__grid"><div class="hero__text">${text}</div>${photo ? figure(photo, "hero__photo", true) : ""}</div></div></section>`;
    case "split-left":
      return `<section class="hero hero--flip" id="top"><div class="wrap"><div class="hero__grid">${figure(photo, "hero__photo", true)}<div class="hero__text">${text}</div></div></div></section>`;
    default:
      return `<section class="hero" id="top"><div class="wrap"><div class="hero__grid"><div class="hero__text">${text}</div>${figure(photo, "hero__photo", true)}</div></div></section>`;
  }
}

function services(c: SiteContent, v: Variants): string {
  const s = c.services;
  const h = head(s.eyebrow, s.title, s.intro, v.services === "cards" || v.services === "tiles");
  switch (v.services) {
    case "list":
      return `<section class="services--list" id="services"><div class="wrap">${h}<div class="grid">${s.items.map((i) => `<div class="row">${badge(i.icon)}<div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div></div>`).join("")}</div></div></section>`;
    case "feature":
      return `<section class="services--feature" id="services"><div class="wrap"><div class="feature">${h}<div class="stack">${s.items.map((i) => `<div class="card">${badge(i.icon)}<div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div></div>`).join("")}</div></div></div></section>`;
    case "tiles":
      return `<section class="services--tiles" id="services"><div class="wrap">${h}<div class="grid">${s.items.map((i) => `<div class="tile">${icon(i.icon)}<h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`).join("")}</div></div></section>`;
    default:
      return `<section class="services--cards" id="services"><div class="wrap">${h}<div class="grid">${s.items.map((i) => `<div class="card">${badge(i.icon)}<h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`).join("")}</div></div></section>`;
  }
}

function values(c: SiteContent, v: Variants): string {
  const cls = v.values === "dark" ? "on-dark" : v.values === "accent" ? "on-accent" : "values--light";
  return `<section class="values ${cls}" id="why"><div class="wrap">${c.values.title ? `<div class="sec-head"><h2>${esc(c.values.title)}</h2></div>` : ""}<div class="vgrid">${c.values.items.map((i) => `<div class="vitem">${icon(i.icon)}<h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`).join("")}</div></div></section>`;
}

function process(c: SiteContent, v: Variants): string {
  const p = c.process;
  return `<section class="process--${v.process}" id="process"><div class="wrap">${head(p.eyebrow, p.title, p.intro, v.process !== "timeline")}<div class="steps">${p.steps.map((s, i) => `<div class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></div>`).join("")}</div></div></section>`;
}

function about(c: SiteContent, v: Variants, ph: RenderPhotos): string {
  const a = c.about;
  const text = `<div class="about__text"><span class="eyebrow">${esc(a.eyebrow)}</span><h2>${esc(a.title || c.brand.name)}</h2>${a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}${a.bullets.length ? `<ul class="ticks">${a.bullets.map((b) => `<li>${icon("circle-check")}<span>${esc(b)}</span></li>`).join("")}</ul>` : ""}${a.cta ? `<div class="actions"><a class="btn" href="#contact">${esc(a.cta)}</a></div>` : ""}</div>`;
  const photo = ph.work ?? ph.detail ?? ph.hero;
  if (v.about === "centered" || !photo) return `<section class="about--centered" id="about"><div class="wrap">${text}${photo ? figure(photo, "about__band") : ""}</div></section>`;
  return `<section class="about--${v.about}" id="about"><div class="wrap"><div class="about__grid">${figure(photo, "about__photo")}${text}</div></div></section>`;
}

function faq(c: SiteContent, v: Variants): string {
  const list = c.faq.items.map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
  if (v.faq === "two-col") return `<section class="faq--two-col" id="faq"><div class="wrap"><div class="faq__grid"><div class="sec-head"><span class="eyebrow">FAQ</span><h2>${esc(c.faq.title)}</h2></div><div class="list">${list}</div></div></div></section>`;
  return `<section class="faq--accordion" id="faq"><div class="wrap"><div class="sec-head center"><span class="eyebrow">FAQ</span><h2>${esc(c.faq.title)}</h2></div><div class="list">${list}</div></div></section>`;
}

function cta(c: SiteContent, v: Variants, ph: RenderPhotos): string {
  const k = c.contact;
  const items = [
    k.phone ? `<li>${icon("phone")}<a href="tel:${esc(k.phone.replace(/[^\d+]/g, ""))}">${esc(k.phone)}</a></li>` : "",
    k.email ? `<li>${icon("mail")}<a href="mailto:${esc(k.email)}">${esc(k.email)}</a></li>` : "",
    k.address ? `<li>${icon("map-pin")}<span>${esc(k.address)}</span></li>` : "",
    k.hours ? `<li>${icon("clock")}<span>${esc(k.hours)}</span></li>` : "",
  ].filter(Boolean);
  const main = `<span class="eyebrow">Get in touch</span><h2>${esc(c.cta.title)}</h2>${c.cta.text ? `<p class="lede">${esc(c.cta.text)}</p>` : ""}<div class="actions">${k.phone ? `<a class="btn" href="tel:${esc(k.phone.replace(/[^\d+]/g, ""))}">${esc(c.cta.button)}</a>` : k.email ? `<a class="btn" href="mailto:${esc(k.email)}">${esc(c.cta.button)}</a>` : `<a class="btn" href="#top">${esc(c.cta.button)}</a>`}</div>${items.length ? `<ul class="contact-list">${items.join("")}</ul>` : ""}`;
  const photo = ph.detail ?? ph.work ?? ph.hero;
  if (v.cta === "photo" && photo) return `<section class="cta cta--photo" id="contact"><div class="cta__bg">${img(photo)}</div><div class="wrap"><div class="cta__in">${main}</div></div></section>`;
  return `<section class="cta ${v.cta === "accent" ? "on-accent" : "on-dark"}" id="contact"><div class="wrap">${main}</div></section>`;
}

function footer(c: SiteContent, v: Variants): string {
  const name = esc(c.brand.name);
  const k = c.contact;
  const year = new Date().getFullYear();
  if (v.footer === "columns") {
    return `<footer class="ftr"><div class="wrap"><div class="ftr__cols"><div><a class="logo" href="#top">${name}</a><p>${esc(c.footer.blurb || c.brand.tagline)}</p></div><div><h3>Explore</h3><ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul></div><div><h3>Contact</h3><ul>${[k.phone ? `<li><a href="tel:${esc(k.phone.replace(/[^\d+]/g, ""))}">${esc(k.phone)}</a></li>` : "", k.email ? `<li><a href="mailto:${esc(k.email)}">${esc(k.email)}</a></li>` : "", k.address ? `<li>${esc(k.address)}</li>` : "", k.hours ? `<li>${esc(k.hours)}</li>` : ""].join("") || '<li><a href="#contact">Get a free quote</a></li>'}</ul></div></div><p class="ftr__copy">© ${year} ${name}</p></div></footer>`;
  }
  return `<footer class="ftr"><div class="wrap"><div class="ftr__simple"><a class="logo" href="#top">${name}</a><p>${esc(c.footer.blurb || c.brand.tagline)}</p></div><p class="ftr__copy">© ${year} ${name}</p></div></footer>`;
}

/* ---------- page ---------- */

export function renderSite(content: SiteContent, design: SiteDesign, photos: RenderPhotos): string {
  const p = paletteById(design.palette);
  if (!p) throw new Error(`unknown palette ${design.palette}`);
  const v = design.variants;
  const title = `${content.brand.name}${content.brand.tagline ? ` — ${content.brand.tagline}` : ""}`;
  return `<!doctype html>
<html lang="en-IE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(content.hero.sub)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${esc(p.fontsHref)}">
<style>${css(p)}</style></head>
<body data-palette="${esc(p.id)}" data-mood="${p.mode}">
${header(content, v)}
<main>
${hero(content, v, photos)}
${services(content, v)}
${values(content, v)}
${process(content, v)}
${about(content, v, photos)}
${faq(content, v)}
${cta(content, v, photos)}
</main>
${footer(content, v)}
</body></html>`;
}
