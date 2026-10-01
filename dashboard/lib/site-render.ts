/* Renders a SiteContent + SiteDesign into a complete, self-contained HTML page.

   All text is HTML-escaped here, all layout/CSS is fixed and tested (see test/site-render.test.mjs and the
   combination sweep described in the project notes), and colours come only from a contrast-checked palette.
   Nothing the model wrote is ever interpreted as markup. */
import { iconSvg } from "./icons";
import { initials, logoHtml, LOGO_CSS } from "./logo";
import { paletteById, type Palette } from "./palettes";
import { VARIANT_DEFAULTS, type SiteContent, type SiteDesign, type Variants } from "./site-blocks";
import { EXTRA_CSS } from "./site-css-extra";

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
  // The logo badge's gradient must keep its text readable: darken the accent only when the text on it is light.
  const accent2 = lum(p.accentInk) > lum(p.accent) ? `color-mix(in srgb,${p.accent} 72%,${p.ink})` : `color-mix(in srgb,${p.accent} 78%,#ffffff)`;
  const mood = p.mode;
  const radius = mood === "bold" ? "6px" : mood === "soft" ? "24px" : "14px";
  const btnRadius = mood === "bold" ? "6px" : "999px";
  const shadow = mood === "bold" ? "none" : mood === "dark" ? "0 10px 30px rgba(0,0,0,.35)" : "0 10px 30px rgba(20,24,40,.08)";
  const lift = mood === "bold" ? "none" : mood === "dark" ? "0 18px 44px rgba(0,0,0,.5)" : "0 18px 44px rgba(20,24,40,.14)";
  const border = mood === "bold" ? "2px solid var(--ink)" : "1px solid var(--line)";
  return `
:root{--bg:${p.bg};--surface:${p.surface};--ink:${p.ink};--muted:${p.muted};--accent:${p.accent};--accent-ink:${p.accentInk};--dark:${p.dark};--dark-ink:${p.darkInk};--accent-on-dark:${accentOnDark};--eyebrow:${eyebrow};--accent2:${accent2};
--tint:color-mix(in srgb,var(--accent) 11%,var(--bg));--tint2:color-mix(in srgb,var(--accent) 22%,var(--bg));--line:color-mix(in srgb,var(--ink) 13%,transparent);
--r:${radius};--btn-r:${btnRadius};--shadow:${shadow};--lift:${lift};--card-border:${border};--fh:'${p.heading}',Georgia,serif;--fb:'${p.body}',system-ui,-apple-system,'Segoe UI',sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.65 var(--fb);-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:var(--fh);line-height:1.1;margin:0 0 .5em;letter-spacing:-.015em;font-weight:700;overflow-wrap:break-word;text-wrap:balance}
h1{font-size:clamp(2.25rem,5.2vw,4rem)}h2{font-size:clamp(1.8rem,3.5vw,2.65rem)}h3{font-size:1.18rem;letter-spacing:-.005em}
p{margin:0 0 1em}img{display:block;max-width:100%}a{color:inherit}
.wrap{max-width:1180px;margin:0 auto;padding:0 clamp(20px,4vw,40px)}
section{padding:clamp(60px,8vw,108px) 0}
[id]{scroll-margin-top:96px}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--eyebrow);margin-bottom:16px}
.eyebrow::before{content:"";width:26px;height:2px;background:currentColor;opacity:.6;border-radius:2px}
.sec-head.center .eyebrow::after{content:"";width:26px;height:2px;background:currentColor;opacity:.6;border-radius:2px}
.lede{color:var(--muted);font-size:1.1rem;max-width:62ch}
.sec-head{max-width:720px;margin-bottom:clamp(30px,4vw,52px)}
.sec-head.center{margin-left:auto;margin-right:auto;text-align:center}.sec-head.center .lede{margin-left:auto;margin-right:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.55em;padding:.88em 1.55em;border-radius:var(--btn-r);background:var(--accent);color:var(--accent-ink);font:700 .98rem var(--fb);text-decoration:none;border:2px solid var(--accent);cursor:pointer;transition:transform .18s,box-shadow .18s}
.btn:hover{transform:translateY(-2px);box-shadow:var(--lift)}.btn .ic{width:1.1em;height:1.1em;transition:transform .18s}.btn:hover .ic{transform:translateX(3px)}
.btn--ghost{background:transparent;color:inherit;border-color:color-mix(in srgb,currentColor 35%,transparent)}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 0;padding:0;list-style:none}
.chips li{display:inline-flex;align-items:center;gap:8px;font-size:.88rem;font-weight:600;padding:8px 14px;border-radius:999px;background:var(--surface);border:1px solid var(--line)}
.chips .ic{width:1.1em;height:1.1em;color:var(--accent)}
.on-dark{background:var(--dark);color:var(--dark-ink)}.on-dark .lede,.on-dark p{color:color-mix(in srgb,var(--dark-ink) 80%,transparent)}.on-dark .eyebrow,.on-dark .ic{color:var(--accent-on-dark)}
.on-dark .chips li{background:color-mix(in srgb,var(--dark-ink) 10%,transparent);border-color:color-mix(in srgb,var(--dark-ink) 22%,transparent);color:var(--dark-ink)}
.on-accent{background:var(--accent);color:var(--accent-ink)}.on-accent .lede,.on-accent p{color:color-mix(in srgb,var(--accent-ink) 88%,transparent)}.on-accent .eyebrow,.on-accent .ic{color:var(--accent-ink)}
.on-accent .btn{background:var(--accent-ink);color:var(--accent);border-color:var(--accent-ink)}.on-accent .btn--ghost{background:transparent;color:var(--accent-ink);border-color:color-mix(in srgb,var(--accent-ink) 55%,transparent)}
.ic{width:1.5em;height:1.5em;flex:none}
.badge{display:inline-grid;place-items:center;width:54px;height:54px;border-radius:calc(var(--r) * .85);background:linear-gradient(145deg,var(--tint),var(--tint2));color:var(--accent);margin-bottom:18px}.badge .ic{width:26px;height:26px}
.card{background:var(--surface);border:var(--card-border);border-radius:var(--r);box-shadow:var(--shadow);padding:clamp(22px,2.4vw,32px);transition:transform .2s,box-shadow .2s}.card:hover{transform:translateY(-4px);box-shadow:var(--lift)}
.card p:last-child,.card h3:last-child{margin-bottom:0}.card p{color:var(--muted);font-size:.97rem}
.photo{margin:0;border-radius:var(--r);overflow:hidden;box-shadow:var(--lift);border:var(--card-border);background:var(--tint)}.photo img{width:100%;height:100%;object-fit:cover;aspect-ratio:3/2}
@media(prefers-reduced-motion:no-preference){.rise>*{animation:rise .7s cubic-bezier(.2,.7,.2,1) both}.rise>*:nth-child(2){animation-delay:.08s}.rise>*:nth-child(3){animation-delay:.16s}.rise>*:nth-child(4){animation-delay:.24s}.rise>*:nth-child(5){animation-delay:.32s}}
@keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}

/* top bar + header + logo */
.topbar{background:var(--dark);color:var(--dark-ink);font-size:.82rem}
.topbar .wrap{display:flex;gap:6px 28px;align-items:center;justify-content:space-between;min-height:40px;flex-wrap:wrap}
.topbar ul{list-style:none;display:flex;gap:6px 24px;margin:0;padding:0;flex-wrap:wrap}.topbar li{display:flex;gap:8px;align-items:center}
.topbar .ic{width:1.05em;height:1.05em;color:var(--accent-on-dark)}.topbar a{text-decoration:none;font-weight:600}.topbar__msg{display:flex;gap:8px;align-items:center;opacity:.9}
.hdr{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:saturate(1.5) blur(12px);border-bottom:1px solid var(--line)}
.hdr .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:76px}
.logo{display:inline-flex;align-items:center;gap:12px;text-decoration:none;min-width:0}
.logo__mark{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:calc(var(--r) * .75);background:linear-gradient(145deg,var(--accent),var(--accent2));color:var(--accent-ink);font:700 1.05rem var(--fh);letter-spacing:.02em;box-shadow:0 6px 14px color-mix(in srgb,var(--accent) 35%,transparent)}
.logo__mark .ic{width:24px;height:24px}.logo--monogram .logo__mark{border-radius:50%}
.logo--mark .logo__mark{background:none;box-shadow:none;color:var(--eyebrow);width:auto;height:auto}.logo--mark .logo__mark .ic{width:30px;height:30px}
.logo__name{font:700 1.22rem/1.1 var(--fh);letter-spacing:-.012em;display:block}.logo small{display:block;font:500 .7rem/1.3 var(--fb);color:var(--muted);letter-spacing:.03em;margin-top:2px}
.nav{display:flex;gap:30px;align-items:center}.nav a{position:relative;text-decoration:none;font-size:.93rem;font-weight:600;color:var(--muted);padding:6px 0}.nav a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .2s}.nav a:hover{color:var(--ink)}.nav a:hover::after{transform:scaleX(1)}
.hdr__right{display:flex;align-items:center;gap:18px}.hdr__tel{display:inline-flex;align-items:center;gap:8px;font-weight:700;text-decoration:none;font-size:.95rem;white-space:nowrap}.hdr__tel .ic{width:1.15em;height:1.15em;color:var(--eyebrow)}
.hdr--center .wrap{flex-wrap:wrap;justify-content:center;padding-top:14px;padding-bottom:12px;gap:10px 24px}.hdr--center .logo{flex:1 1 100%;justify-content:center}.hdr--center .hdr__right{display:none}
.hdr--center .nav{padding-top:10px;border-top:1px solid var(--line);width:100%;justify-content:center}
@media(max-width:960px){.nav{display:none}.hdr__tel span{display:none}}
@media(max-width:860px){.hdr--center .wrap{justify-content:space-between;flex-wrap:nowrap;padding-top:0;padding-bottom:0}.hdr--center .logo{flex:0 1 auto;justify-content:flex-start}.hdr--center .hdr__right{display:flex}.topbar__msg{display:none}.topbar .wrap{justify-content:center}.logo small{display:none}.hdr .wrap{min-height:68px}}
@media(max-width:480px){.hdr__right .btn{padding:.7em 1.1em;font-size:.88rem}.logo__name{font-size:1.08rem}}

/* hero */
.hero{padding:clamp(52px,7vw,104px) 0 clamp(72px,8vw,120px);background:radial-gradient(900px 440px at 92% -6%,var(--tint),transparent 62%),radial-gradient(700px 360px at -6% 100%,var(--tint),transparent 60%)}
.hero__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,5vw,72px);align-items:center}
.hero--flip .hero__grid{grid-template-columns:1fr 1fr}.hero--flip .hero__media{order:-1}
.hero h1{margin-bottom:.42em}.hero__sub{font-size:1.16rem;color:var(--muted);max-width:54ch}
.hero__media{position:relative;isolation:isolate}
.hero__media::before{content:"";position:absolute;z-index:-1;right:-16px;bottom:-16px;width:72%;height:72%;border-radius:var(--r);background:linear-gradient(145deg,var(--tint2),var(--tint));border:1px solid var(--line)}
.hero--flip .hero__media::before{right:auto;left:-16px}
.hero__media .photo img{aspect-ratio:4/3.4}
.float{position:absolute;left:-24px;bottom:30px;display:flex;gap:14px;align-items:center;background:var(--surface);border:var(--card-border);box-shadow:var(--lift);border-radius:var(--r);padding:14px 20px 14px 14px;max-width:270px}
.hero--flip .float{left:auto;right:-24px}
.float .badge{margin:0;width:46px;height:46px}.float strong{display:block;font-size:.95rem;line-height:1.2}.float small{display:block;color:var(--muted);font-size:.78rem;margin-top:2px}
.hero--centered{text-align:center}.hero--centered .hero__sub{margin-left:auto;margin-right:auto}.hero--centered .actions,.hero--centered .chips{justify-content:center}
.hero--centered .hero__band{margin-top:clamp(32px,4vw,52px)}.hero--centered .hero__band img{aspect-ratio:21/8}
.hero--full{position:relative;isolation:isolate;min-height:min(80vh,740px);display:flex;align-items:center;color:var(--dark-ink);background:var(--dark)}
.hero--full .hero__bg{position:absolute;inset:0;z-index:-2}.hero--full .hero__bg img{width:100%;height:100%;object-fit:cover}
.hero--full::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,color-mix(in srgb,var(--dark) 94%,transparent) 0%,color-mix(in srgb,var(--dark) 80%,transparent) 42%,color-mix(in srgb,var(--dark) 18%,transparent) 100%)}
.hero--full .hero__sub{color:color-mix(in srgb,var(--dark-ink) 88%,transparent)}.hero--full .eyebrow,.hero--full .chips .ic{color:var(--accent-on-dark)}
.hero--full .chips li{background:color-mix(in srgb,var(--dark-ink) 12%,transparent);border-color:color-mix(in srgb,var(--dark-ink) 26%,transparent);color:var(--dark-ink)}
.hero--full .btn--ghost{color:var(--dark-ink)}.hero--full .hero__text{max-width:660px}
.hero--bold{background:var(--accent);color:var(--accent-ink)}.hero--bold .hero__grid{grid-template-columns:1.2fr .8fr}.hero--bold h1{text-transform:uppercase;font-size:clamp(2rem,4.6vw,3.7rem);line-height:1.04}
.hero--bold .hero__sub{color:color-mix(in srgb,var(--accent-ink) 88%,transparent)}.hero--bold .eyebrow,.hero--bold .chips .ic{color:var(--accent-ink)}
.hero--bold .btn{background:var(--accent-ink);color:var(--accent);border-color:var(--accent-ink)}.hero--bold .btn--ghost{background:transparent;color:var(--accent-ink);border-color:color-mix(in srgb,var(--accent-ink) 55%,transparent)}
.hero--bold .hero__media::before{display:none}.hero--bold .photo{border:4px solid var(--accent-ink);box-shadow:10px 10px 0 color-mix(in srgb,var(--accent-ink) 85%,transparent)}.hero--bold .float{display:none}
@media(max-width:860px){.hero__grid,.hero--flip .hero__grid,.hero--bold .hero__grid{grid-template-columns:1fr}.hero--flip .hero__media{order:0}.hero--full{min-height:0;padding:76px 0}.hero--full::before{background:color-mix(in srgb,var(--dark) 82%,transparent)}.float{left:14px;right:14px;bottom:14px;max-width:none}.hero--flip .float{left:14px;right:14px}.hero__media::before{right:-8px;bottom:-8px}.hero--flip .hero__media::before{left:-8px}}

/* trust strip that overlaps the hero's lower edge */
.strip{position:relative;z-index:3;margin-top:-46px;padding:0 0 clamp(20px,3vw,36px)}
.strip ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);background:var(--surface);border:var(--card-border);border-radius:var(--r);box-shadow:var(--lift);overflow:hidden}
.strip li{display:flex;gap:14px;align-items:center;padding:20px 24px;font-weight:700;font-size:.97rem;line-height:1.3}.strip li+li{border-left:1px solid var(--line)}
.strip .badge{margin:0;width:44px;height:44px;flex:none}.strip .badge .ic{width:22px;height:22px}
@media(max-width:860px){.strip{margin-top:-28px}.strip ul{grid-template-columns:1fr}.strip li+li{border-left:0;border-top:1px solid var(--line)}.strip li{padding:14px 18px}}

/* services */
.grid{display:grid;gap:clamp(16px,2vw,28px)}
.services--cards,.services--tiles,.services--list{background-image:radial-gradient(color-mix(in srgb,var(--ink) 8%,transparent) 1px,transparent 1.3px);background-size:24px 24px}
.services--cards .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr))}
.services--cards .card h3,.services--tiles .tile h3{margin-bottom:.4em}
.services--tiles .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr))}
.tile{background:linear-gradient(160deg,var(--tint),color-mix(in srgb,var(--accent) 16%,var(--bg)));border-radius:var(--r);padding:clamp(24px,2.6vw,34px);border:1px solid color-mix(in srgb,var(--accent) 14%,transparent);transition:transform .2s,box-shadow .2s}.tile:hover{transform:translateY(-4px);box-shadow:var(--lift)}.tile .ic{width:36px;height:36px;color:var(--accent);margin-bottom:20px}.tile p{color:var(--muted);font-size:.97rem;margin:0}
.services--list .grid{grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:0 clamp(28px,5vw,64px)}
.row{display:flex;gap:18px;padding:24px 0;border-bottom:1px solid var(--line)}.row .badge{margin:0;flex:none}.row h3{margin-bottom:.25em}.row p{margin:0;color:var(--muted);font-size:.97rem}
.services--feature .feature{display:grid;grid-template-columns:.8fr 1.4fr;gap:clamp(28px,5vw,72px);align-items:start}.services--feature .sec-head{position:sticky;top:120px;margin:0}
.services--feature .stack{display:grid;gap:14px}.stack .card{display:flex;gap:18px;align-items:flex-start}.stack .card .badge{margin:0}
@media(max-width:860px){.services--feature .feature{grid-template-columns:1fr}.services--feature .sec-head{position:static;margin-bottom:28px}.services--list .grid{grid-template-columns:1fr}}

/* values (diagonal-edged band) */
.values{position:relative;padding:clamp(72px,8vw,112px) 0}.values .sec-head{margin-bottom:clamp(24px,3vw,40px)}
.values.on-dark,.values.on-accent{clip-path:polygon(0 28px,100% 0,100% calc(100% - 28px),0 100%);margin:-14px 0;z-index:1}
.vgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:clamp(20px,3vw,40px)}
.vitem .ic{width:32px;height:32px;margin-bottom:14px}.vitem h3{margin-bottom:.35em}.vitem p{margin:0;font-size:.96rem}
.values--light{background:var(--surface);border-block:1px solid var(--line)}.values--light .vitem .ic{color:var(--accent)}.values--light .vitem p{color:var(--muted)}

/* ticker */
.ticker{padding:22px 0;background:var(--surface);border-block:1px solid var(--line)}
.ticker ul{list-style:none;display:flex;flex-wrap:wrap;gap:8px 34px;justify-content:center;margin:0;padding:0}
.ticker li{display:flex;align-items:center;gap:34px;font:700 clamp(1.05rem,2.2vw,1.45rem) var(--fh);color:color-mix(in srgb,var(--ink) 78%,transparent);letter-spacing:-.01em}
.ticker li::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent)}.ticker li:last-child::after{display:none}
@media(max-width:600px){.ticker li{gap:18px}.ticker ul{gap:6px 18px}}

/* process */
.process--cards .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:clamp(16px,2vw,24px)}
.step__n{display:inline-grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font:700 1.05rem var(--fh);margin-bottom:16px;box-shadow:0 6px 14px color-mix(in srgb,var(--accent) 30%,transparent)}
.step h3{margin-bottom:.3em}.step p{margin:0;color:var(--muted);font-size:.96rem}
.process--timeline .steps{max-width:760px;position:relative;display:grid;gap:32px}
.process--timeline .step{display:grid;grid-template-columns:46px 1fr;gap:20px;position:relative}.process--timeline .step__n{margin:0;position:relative;z-index:1}
.process--timeline .step:not(:last-child)::after{content:"";position:absolute;left:22px;top:48px;bottom:-32px;width:2px;background:var(--line)}
.process--steps .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;position:relative}
.process--steps .step{position:relative;padding-top:6px}.process--steps .step:not(:last-child)::after{content:"";position:absolute;top:29px;left:60px;right:-12px;height:2px;background:linear-gradient(90deg,var(--line),transparent)}
@media(max-width:860px){.process--steps .step:not(:last-child)::after{display:none}}
.process--cards .step{background:var(--surface);border:var(--card-border);border-radius:var(--r);padding:26px;box-shadow:var(--shadow);transition:transform .2s,box-shadow .2s}.process--cards .step:hover{transform:translateY(-4px);box-shadow:var(--lift)}

/* about */
.about__grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,5vw,80px);align-items:center}
.about--photo-right .about__photo{order:2}
.about__media{position:relative;isolation:isolate}.about__media::before{content:"";position:absolute;z-index:-1;left:-16px;top:-16px;width:62%;height:62%;border-radius:var(--r);background:linear-gradient(145deg,var(--tint2),var(--tint))}.about--photo-right .about__media::before{left:auto;right:-16px}
.about__text p{color:var(--muted)}
.ticks{list-style:none;margin:24px 0 0;padding:0;display:grid;gap:12px}.ticks li{display:flex;gap:12px;align-items:flex-start;font-weight:600}.ticks .ic{width:1.3em;height:1.3em;color:var(--accent);margin-top:.1em}
.about--centered .about__text{max-width:760px;margin:0 auto;text-align:center}.about--centered .about__text .eyebrow::after{content:"";width:26px;height:2px;background:currentColor;opacity:.6;border-radius:2px}.about--centered .ticks{justify-content:center;justify-items:center}.about--centered .actions{justify-content:center}
.about--centered .about__band{margin-top:clamp(32px,4vw,52px)}.about--centered .about__band img{aspect-ratio:21/8}
@media(max-width:860px){.about__grid{grid-template-columns:1fr}.about--photo-right .about__photo,.about--photo-right .about__media{order:0}.about__media::before{left:-8px;top:-8px}.about--photo-right .about__media::before{right:-8px}}

/* faq */
details{background:var(--surface);border:var(--card-border);border-radius:var(--r);margin-bottom:12px;overflow:hidden;transition:box-shadow .2s}details[open]{box-shadow:var(--shadow)}
summary{list-style:none;cursor:pointer;padding:22px 26px;font:700 1.03rem var(--fb);display:flex;justify-content:space-between;gap:16px;align-items:center}
summary::-webkit-details-marker{display:none}summary::after{content:"+";display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--tint);font:400 1.4rem/1 var(--fb);color:var(--accent);flex:none}details[open] summary::after{content:"–"}
details p{padding:0 26px 24px;margin:0;color:var(--muted)}
.faq--accordion .list{max-width:820px;margin:0 auto}
.faq--two-col .faq__grid{display:grid;grid-template-columns:.8fr 1.4fr;gap:clamp(28px,5vw,72px);align-items:start}.faq--two-col .sec-head{margin:0;position:sticky;top:120px}
@media(max-width:860px){.faq--two-col .faq__grid{grid-template-columns:1fr}.faq--two-col .sec-head{position:static;margin-bottom:24px}}

/* cta / contact */
.cta{text-align:center}.cta .wrap{max-width:860px}.cta h2{font-size:clamp(1.9rem,4vw,3.05rem)}.cta .actions{justify-content:center}.cta .eyebrow::after{content:"";width:26px;height:2px;background:currentColor;opacity:.6;border-radius:2px}
.cta--photo{position:relative;isolation:isolate;text-align:left;color:var(--dark-ink)}.cta--photo .cta__bg{position:absolute;inset:0;z-index:-2}.cta--photo .cta__bg img{width:100%;height:100%;object-fit:cover}.cta--photo .eyebrow::after{display:none}
.cta--photo::before{content:"";position:absolute;inset:0;z-index:-1;background:color-mix(in srgb,var(--dark) 86%,transparent)}.cta--photo .cta__in{max-width:640px}.cta--photo .actions{justify-content:flex-start}
.cta--photo p{color:color-mix(in srgb,var(--dark-ink) 86%,transparent)}.cta--photo .btn--ghost{color:var(--dark-ink)}.cta--photo .eyebrow,.cta--photo .ic{color:var(--accent-on-dark)}
.contact-list{display:flex;flex-wrap:wrap;gap:12px 28px;justify-content:center;list-style:none;margin:20px 0 0;padding:0;font-weight:600}.cta--photo .contact-list{justify-content:flex-start}
.contact-list li{display:flex;gap:10px;align-items:center}.contact-list a{text-decoration:none;border-bottom:1px solid currentColor}.contact-list .ic{width:1.2em;height:1.2em}

/* footer */
.ftr{padding:clamp(44px,5vw,68px) 0 28px;background:var(--dark);color:var(--dark-ink);font-size:.93rem}.ftr p{color:color-mix(in srgb,var(--dark-ink) 75%,transparent);margin:0}
.ftr a{text-decoration:none;color:color-mix(in srgb,var(--dark-ink) 85%,transparent)}.ftr a:hover{color:var(--dark-ink)}
.ftr .logo{color:var(--dark-ink)}.ftr .logo__mark{background:var(--accent-on-dark);color:var(--dark);box-shadow:none}.ftr .logo small{color:color-mix(in srgb,var(--dark-ink) 65%,transparent)}.ftr .logo--mark .logo__mark{background:none;color:var(--accent-on-dark)}
.ftr__simple{display:flex;flex-wrap:wrap;gap:18px 40px;align-items:center;justify-content:space-between}
.ftr__cols{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:36px}.ftr h3{font:700 .8rem var(--fb);letter-spacing:.12em;text-transform:uppercase;color:var(--dark-ink);margin:0 0 14px}
.ftr ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}.ftr .logo{margin-bottom:14px}
.ftr__copy{margin-top:34px;padding-top:20px;border-top:1px solid color-mix(in srgb,var(--dark-ink) 16%,transparent);font-size:.82rem}
@media(max-width:860px){.ftr__cols{grid-template-columns:1fr}}
${LOGO_CSS}
${EXTRA_CSS}
`;
}

/* ---------- html helpers ---------- */

const img = (p: RenderPhoto | undefined, cls = "", eager = false) => (p ? `<img${cls ? ` class="${cls}"` : ""} src="${esc(p.url)}" alt="${esc(p.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">` : "");
const figure = (p: RenderPhoto | undefined, cls: string, eager = false) => (p ? `<figure class="photo ${cls}">${img(p, "", eager)}</figure>` : "");
const icon = (name: string) => iconSvg(name);
const badge = (name: string) => `<span class="badge">${icon(name)}</span>`;
const head = (eyebrow: string, title: string, intro = "", center = false) =>
  `<div class="sec-head${center ? " center" : ""}">${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}<h2>${esc(title)}</h2>${intro ? `<p class="lede">${esc(intro)}</p>` : ""}</div>`;
const tel = (n: string) => n.replace(/[^\d+]/g, "");

const NAV: [string, string][] = [["#services", "Services"], ["#process", "How it works"], ["#about", "About"], ["#faq", "FAQ"], ["#contact", "Contact"]];

export { initials };

function logo(c: SiteContent, v: Variants): string {
  return logoHtml(c.brand, v.logo);
}

function topbar(c: SiteContent, v: Variants): string {
  const k = c.contact;
  const items = [
    k.phone ? `<li>${icon("phone")}<a href="tel:${esc(tel(k.phone))}">${esc(k.phone)}</a></li>` : "",
    k.hours ? `<li>${icon("clock")}<span>${esc(k.hours)}</span></li>` : "",
    k.address ? `<li>${icon("map-pin")}<span>${esc(k.address)}</span></li>` : "",
  ].filter(Boolean);
  const msg = c.hero.chips[0];
  if (v.topbar !== "on" || (!items.length && !msg)) return "";
  return `<div class="topbar"><div class="wrap"><ul>${items.join("") || `<li>${icon("map-pin")}<span>${esc(c.hero.eyebrow || c.brand.tagline)}</span></li>`}</ul>${msg ? `<span class="topbar__msg">${icon(msg.icon)}${esc(msg.text)}</span>` : ""}</div></div>`;
}

function header(c: SiteContent, v: Variants): string {
  const phone = c.contact.phone;
  return `${topbar(c, v)}<header class="hdr hdr--${v.header}"><div class="wrap">${logo(c, v)}<nav class="nav" aria-label="Main">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</nav><div class="hdr__right">${phone ? `<a class="hdr__tel" href="tel:${esc(tel(phone))}">${icon("phone")}<span>${esc(phone)}</span></a>` : ""}<a class="btn" href="#contact">${esc(c.hero.primaryCta)}${icon("arrow-right")}</a></div></div></header>`;
}

function hero(c: SiteContent, v: Variants, ph: RenderPhotos): string {
  const h = c.hero;
  const chipsInside = v.hero === "full";
  const chips = chipsInside && h.chips.length ? `<ul class="chips">${h.chips.map((x) => `<li>${icon(x.icon)}${esc(x.text)}</li>`).join("")}</ul>` : "";
  const text = `${h.eyebrow ? `<span class="eyebrow">${esc(h.eyebrow)}</span>` : ""}<h1>${esc(h.headline)}</h1><p class="hero__sub">${esc(h.sub)}</p><div class="actions"><a class="btn" href="#contact">${esc(h.primaryCta)}${icon("arrow-right")}</a><a class="btn btn--ghost" href="#services">${esc(h.secondaryCta)}</a></div>${chips}`;
  const photo = ph.hero;
  const float = h.chips[0] ? `<div class="float">${badge(h.chips[0].icon)}<div><strong>${esc(h.chips[0].text)}</strong>${h.eyebrow ? `<small>${esc(h.eyebrow)}</small>` : ""}</div></div>` : "";
  const media = (cls: string) => (photo ? `<div class="hero__media ${cls}">${figure(photo, "hero__photo", true)}${float}</div>` : "");
  const strip = !chipsInside && h.chips.length ? `<div class="strip"><div class="wrap"><ul>${h.chips.map((x) => `<li>${badge(x.icon)}<span>${esc(x.text)}</span></li>`).join("")}</ul></div></div>` : "";
  let html: string;
  switch (v.hero) {
    case "full":
      html = `<section class="hero hero--full" id="top"><div class="hero__bg">${img(photo, "", true)}</div><div class="wrap"><div class="hero__text rise">${text}</div></div></section>`;
      break;
    case "centered":
      html = `<section class="hero hero--centered${photo ? "" : " hero--nophoto"}" id="top"><div class="wrap"><div class="rise">${text}</div>${photo ? figure(photo, "hero__band", true) : ""}</div></section>`;
      break;
    case "bold":
      html = `<section class="hero hero--bold${photo ? "" : " hero--nophoto"}" id="top"><div class="wrap"><div class="hero__grid"><div class="hero__text rise">${text}</div>${media("")}</div></div></section>`;
      break;
    case "split-left":
      html = `<section class="hero hero--flip" id="top"><div class="wrap"><div class="hero__grid">${media("")}<div class="hero__text rise">${text}</div></div></div></section>`;
      break;
    default:
      html = `<section class="hero" id="top"><div class="wrap"><div class="hero__grid"><div class="hero__text rise">${text}</div>${media("")}</div></div></section>`;
  }
  return html + strip;
}

const swipe = () => `<p class="swipe" aria-hidden="true">Swipe for more ${icon("arrow-right")}</p>`;

function services(c: SiteContent, v: Variants, ph: RenderPhotos): string {
  const s = c.services;
  const photo = ph.detail ?? ph.work ?? ph.hero;
  const kind = v.services === "split" && !photo ? "cards" : v.services;
  const h = head(s.eyebrow, s.title, s.intro, kind === "cards" || kind === "tiles" || kind === "bento");
  const card = (i: (typeof s.items)[number]) => `<div class="card">${badge(i.icon)}<h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`;
  switch (kind) {
    case "list":
      return `<section class="services--list" id="services"><div class="wrap">${h}${swipe()}<div class="grid">${s.items.map((i) => `<div class="row">${badge(i.icon)}<div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div></div>`).join("")}</div></div></section>`;
    case "feature":
      return `<section class="services--feature" id="services"><div class="wrap"><div class="feature">${h}${swipe()}<div class="stack">${s.items.map((i) => `<div class="card">${badge(i.icon)}<div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div></div>`).join("")}</div></div></div></section>`;
    case "tiles":
      return `<section class="services--tiles" id="services"><div class="wrap">${h}${swipe()}<div class="grid">${s.items.map((i) => `<div class="tile">${icon(i.icon)}<h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`).join("")}</div></div></section>`;
    case "split":
      return `<section class="services--split" id="services"><div class="wrap"><div class="split"><div class="split__media">${figure(photo, "")}</div><div class="split__body">${h}${swipe()}<div class="rows">${s.items.map((i) => `<div class="row">${badge(i.icon)}<div><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div></div>`).join("")}</div></div></div></div></section>`;
    case "bento":
      return `<section class="services--bento" id="services"><div class="wrap">${h}${swipe()}<div class="grid">${s.items.map(card).join("")}</div></div></section>`;
    default:
      return `<section class="services--cards" id="services"><div class="wrap">${h}${swipe()}<div class="grid">${s.items.map(card).join("")}</div></div></section>`;
  }
}

function gallery(v: Variants, ph: RenderPhotos): string {
  if (v.gallery !== "band") return "";
  const a = ph.detail, b = ph.hero, d = ph.work;
  if (!a || !b || !d) return "";
  return `<section class="gallery" aria-label="Photos"><div class="wrap"><div class="mosaic"><figure class="m1"><img src="${esc(a.url)}" alt="${esc(a.alt)}" loading="lazy" decoding="async"></figure><figure class="m2"><img src="${esc(b.url)}" alt="${esc(b.alt)}" loading="lazy" decoding="async"></figure><figure class="m3"><img src="${esc(d.url)}" alt="${esc(d.alt)}" loading="lazy" decoding="async"></figure></div></div></section>`;
}

function dock(c: SiteContent): string {
  const phone = c.contact.phone;
  const main = `<a class="dock__main" href="#contact">${esc(c.hero.primaryCta)}</a>`;
  return `<div class="dock">${phone ? `<a class="dock__call" href="tel:${esc(tel(phone))}">${icon("phone")}Call</a>` : ""}${main}</div>`;
}

function values(c: SiteContent, v: Variants): string {
  const cls = v.values === "dark" ? "on-dark" : v.values === "accent" ? "on-accent" : "values--light";
  return `<section class="values ${cls}" id="why"><div class="wrap">${c.values.title ? `<div class="sec-head"><h2>${esc(c.values.title)}</h2></div>` : ""}<div class="vgrid">${c.values.items.map((i) => `<div class="vitem">${icon(i.icon)}<h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`).join("")}</div></div></section>`;
}

function ticker(c: SiteContent, v: Variants): string {
  if (v.band !== "ticker") return "";
  const lis = c.services.items.slice(0, 6).map((i) => `<li>${esc(i.title)}</li>`).join("");
  return `<div class="ticker" aria-hidden="true"><div class="wrap"><div class="track"><ul>${lis}</ul><ul class="dup">${lis}</ul></div></div></div>`;
}

function process(c: SiteContent, v: Variants): string {
  const p = c.process;
  return `<section class="process--${v.process}" id="process"><div class="wrap">${head(p.eyebrow, p.title, p.intro, v.process !== "timeline")}<div class="steps">${p.steps.map((s, i) => `<div class="step"><span class="step__n">${i + 1}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></div>`).join("")}</div></div></section>`;
}

function about(c: SiteContent, v: Variants, ph: RenderPhotos): string {
  const a = c.about;
  const text = `<div class="about__text"><span class="eyebrow">${esc(a.eyebrow)}</span><h2>${esc(a.title || c.brand.name)}</h2>${a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}${a.bullets.length ? `<ul class="ticks">${a.bullets.map((b) => `<li>${icon("circle-check")}<span>${esc(b)}</span></li>`).join("")}</ul>` : ""}${a.cta ? `<div class="actions"><a class="btn" href="#contact">${esc(a.cta)}${icon("arrow-right")}</a></div>` : ""}</div>`;
  const photo = ph.work ?? ph.detail ?? ph.hero;
  if (v.about === "centered" || !photo) return `<section class="about--centered" id="about"><div class="wrap">${text}${photo ? figure(photo, "about__band") : ""}</div></section>`;
  return `<section class="about--${v.about}" id="about"><div class="wrap"><div class="about__grid"><div class="about__media about__photo">${figure(photo, "")}</div>${text}</div></div></section>`;
}

function faq(c: SiteContent, v: Variants): string {
  const list = c.faq.items.map((f, i) => `<details${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");
  if (v.faq === "two-col") return `<section class="faq--two-col" id="faq"><div class="wrap"><div class="faq__grid"><div class="sec-head"><span class="eyebrow">FAQ</span><h2>${esc(c.faq.title)}</h2></div><div class="list">${list}</div></div></div></section>`;
  return `<section class="faq--accordion" id="faq"><div class="wrap"><div class="sec-head center"><span class="eyebrow">FAQ</span><h2>${esc(c.faq.title)}</h2></div><div class="list">${list}</div></div></section>`;
}

function cta(c: SiteContent, v: Variants, ph: RenderPhotos): string {
  const k = c.contact;
  const items = [
    k.phone ? `<li>${icon("phone")}<a href="tel:${esc(tel(k.phone))}">${esc(k.phone)}</a></li>` : "",
    k.email ? `<li>${icon("mail")}<a href="mailto:${esc(k.email)}">${esc(k.email)}</a></li>` : "",
    k.address ? `<li>${icon("map-pin")}<span>${esc(k.address)}</span></li>` : "",
    k.hours ? `<li>${icon("clock")}<span>${esc(k.hours)}</span></li>` : "",
  ].filter(Boolean);
  const href = k.phone ? `tel:${esc(tel(k.phone))}` : k.email ? `mailto:${esc(k.email)}` : "#top";
  const main = `<span class="eyebrow">Get in touch</span><h2>${esc(c.cta.title)}</h2>${c.cta.text ? `<p class="lede">${esc(c.cta.text)}</p>` : ""}<div class="actions"><a class="btn" href="${href}">${esc(c.cta.button)}${icon("arrow-right")}</a></div>${items.length ? `<ul class="contact-list">${items.join("")}</ul>` : ""}`;
  const photo = ph.detail ?? ph.work ?? ph.hero;
  if (v.cta === "photo" && photo) return `<section class="cta cta--photo" id="contact"><div class="cta__bg">${img(photo)}</div><div class="wrap"><div class="cta__in">${main}</div></div></section>`;
  return `<section class="cta ${v.cta === "accent" ? "on-accent" : "on-dark"}" id="contact"><div class="wrap">${main}</div></section>`;
}

function footer(c: SiteContent, v: Variants): string {
  const k = c.contact;
  const name = esc(c.brand.name);
  const year = new Date().getFullYear();
  const lg = logo(c, v);
  if (v.footer === "columns") {
    return `<footer class="ftr"><div class="wrap"><div class="ftr__cols"><div>${lg}<p>${esc(c.footer.blurb || c.brand.tagline)}</p></div><div><h3>Explore</h3><ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul></div><div><h3>Contact</h3><ul>${[k.phone ? `<li><a href="tel:${esc(tel(k.phone))}">${esc(k.phone)}</a></li>` : "", k.email ? `<li><a href="mailto:${esc(k.email)}">${esc(k.email)}</a></li>` : "", k.address ? `<li>${esc(k.address)}</li>` : "", k.hours ? `<li>${esc(k.hours)}</li>` : ""].join("") || '<li><a href="#contact">Get a free quote</a></li>'}</ul></div></div><p class="ftr__copy">© ${year} ${name}</p></div></footer>`;
  }
  return `<footer class="ftr"><div class="wrap"><div class="ftr__simple">${lg}<p>${esc(c.footer.blurb || c.brand.tagline)}</p></div><p class="ftr__copy">© ${year} ${name}</p></div></footer>`;
}

/* ---------- page ---------- */

/* Three section orders so two sites rarely read the same way down the page. */
function body(c: SiteContent, v: Variants, ph: RenderPhotos): string {
  const parts = {
    hero: hero(c, v, ph), services: services(c, v, ph), values: values(c, v), process: process(c, v), ticker: ticker(c, v),
    about: about(c, v, ph), gallery: gallery(v, ph), faq: faq(c, v), cta: cta(c, v, ph),
  };
  const order: (keyof typeof parts)[] =
    v.order === "story" ? ["hero", "about", "services", "gallery", "process", "values", "ticker", "faq", "cta"]
    : v.order === "proof" ? ["hero", "values", "services", "ticker", "process", "about", "gallery", "faq", "cta"]
    : ["hero", "services", "values", "process", "ticker", "about", "gallery", "faq", "cta"];
  return order.map((k) => parts[k]).filter(Boolean).join("\n");
}

export function renderSite(content: SiteContent, design: SiteDesign, photos: RenderPhotos): string {
  const p = paletteById(design.palette);
  if (!p) throw new Error(`unknown palette ${design.palette}`);
  const v: Variants = { ...VARIANT_DEFAULTS, ...design.variants };
  const title = `${content.brand.name}${content.brand.tagline ? ` — ${content.brand.tagline}` : ""}`;
  return `<!doctype html>
<html lang="en-IE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(content.hero.sub)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${esc(p.fontsHref)}">
<style>${css(p)}</style></head>
<body data-palette="${esc(p.id)}" data-mood="${p.mode}">
${header(content, v)}
<main>
${body(content, v, photos)}
</main>
${footer(content, v)}
${dock(content)}
</body></html>`;
}
