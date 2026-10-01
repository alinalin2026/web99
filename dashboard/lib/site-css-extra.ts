/* Layouts added after the first renderer: split and bento services, a photo mosaic, a sticky call bar, and the
   phone-first treatment of every section (swipeable service cards, photo-first hero, timeline steps, chips,
   a scrolling ticker). Appended after the base CSS so these rules win where they overlap. */
export const EXTRA_CSS = `
/* services: split (photo + rows) and bento */
.swipe{display:none}
.services--split .split{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(28px,5vw,72px);align-items:center}
.services--split .split__media{position:sticky;top:110px}.services--split .split__media .photo img{aspect-ratio:4/5}
.services--split .sec-head{margin-bottom:22px}.services--split .rows .row:first-child{border-top:1px solid var(--line)}.services--split .row{padding:18px 0}
.services--bento .grid{grid-template-columns:repeat(4,1fr)}
.services--bento .card:first-child{grid-column:span 2;grid-row:span 2;display:flex;flex-direction:column;justify-content:flex-end;background:linear-gradient(155deg,var(--accent),var(--accent2));color:var(--accent-ink);border-color:transparent}
.services--bento .card:first-child p{color:color-mix(in srgb,var(--accent-ink) 88%,transparent)}.services--bento .card:first-child .badge{background:color-mix(in srgb,var(--accent-ink) 16%,transparent);color:var(--accent-ink)}.services--bento .card:first-child h3{font-size:1.5rem}
.services--bento{background-image:radial-gradient(color-mix(in srgb,var(--ink) 8%,transparent) 1px,transparent 1.3px);background-size:24px 24px}
@media(max-width:1000px){.services--bento .grid{grid-template-columns:repeat(2,1fr)}}

/* photo mosaic: the same few photographs, cropped differently, so the page has rhythm */
.gallery{padding:clamp(28px,4vw,56px) 0}
.mosaic{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:clamp(10px,1.6vw,18px);height:clamp(260px,32vw,400px)}
.mosaic figure{margin:0;overflow:hidden;border-radius:var(--r);border:var(--card-border);box-shadow:var(--shadow);background:var(--tint)}
.mosaic img{width:100%;height:100%;object-fit:cover}
.mosaic .m1 img{object-position:50% 50%}.mosaic .m2 img{object-position:50% 60%;transform:scale(1.18);transform-origin:50% 60%}.mosaic .m3 img{object-position:50% 40%;transform:scale(1.12);transform-origin:50% 40%}

/* process gets a soft tinted ground so it separates from the cards around it */
.process--cards,.process--timeline,.process--steps{background:linear-gradient(180deg,var(--tint),var(--bg) 85%)}

/* sticky call bar (phones only) */
.dock{display:none}
.hero--nophoto{padding-top:clamp(52px,7vw,104px)}

/* ticker as a marquee on phones */
.ticker .track{display:block}.ticker ul.dup{display:none}
@keyframes marq{to{transform:translateX(-50%)}}

@media(max-width:860px){
  section{padding:clamp(44px,10vw,64px) 0}
  .values{padding:clamp(52px,12vw,72px) 0}
  .sec-head{margin-bottom:24px}.sec-head.center{text-align:left;margin-left:0}.sec-head.center .lede{margin-left:0}.sec-head.center .eyebrow::after{display:none}
  h1{font-size:clamp(2rem,9vw,2.6rem)}h2{font-size:clamp(1.65rem,7.4vw,2.1rem)}
  body{padding-bottom:84px}
  .hdr__right .btn{display:none}.hdr__tel span{display:none}

  /* hero: photo first, edge to edge, text underneath */
  .hero{padding:0 0 40px}.hero--nophoto{padding-top:44px}
  .hero__grid{gap:0}
  .hero__media{order:-1;margin:0 -20px 26px}.hero--flip .hero__media{order:-1}
  .hero__media::before{display:none}
  .hero__media .photo{border-radius:0 0 28px 28px;border:0;box-shadow:none}.hero__media .photo img{aspect-ratio:5/4}
  .hero--bold .hero__media .photo{border:0;box-shadow:none}
  .float{display:none}
  .hero .actions .btn:first-child{flex:1 1 100%}
  .hero--centered .wrap{display:flex;flex-direction:column}.hero--centered .hero__band{order:-1;margin:0 -20px 26px;border-radius:0 0 28px 28px}.hero--centered .hero__band img{aspect-ratio:5/4}
  .hero--centered{text-align:left}.hero--centered .actions,.hero--centered .chips{justify-content:flex-start}.hero--centered .hero__sub{margin-left:0}
  .hero--full{min-height:84svh;align-items:flex-end;padding:0 0 44px}
  .hero--full::before{background:linear-gradient(180deg,color-mix(in srgb,var(--dark) 30%,transparent) 0%,color-mix(in srgb,var(--dark) 86%,transparent) 58%,var(--dark) 100%)}
  .hero--full .hero__bg img{object-position:50% 30%}

  /* trust strip: three compact columns instead of a list */
  .strip{margin-top:10px;padding-bottom:6px}
  .strip ul{grid-template-columns:repeat(3,1fr)}
  .strip li{flex-direction:column;text-align:center;gap:8px;padding:14px 6px;font-size:.76rem;line-height:1.25}.strip li+li{border-top:0;border-left:1px solid var(--line)}
  .strip .badge{width:38px;height:38px}.strip .badge .ic{width:19px;height:19px}

  /* services: swipeable cards */
  .services--cards .grid,.services--tiles .grid,.services--bento .grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin-inline:-20px;padding:6px 20px 18px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .services--cards .grid::-webkit-scrollbar,.services--tiles .grid::-webkit-scrollbar,.services--bento .grid::-webkit-scrollbar{display:none}
  .services--cards .card,.services--tiles .tile,.services--bento .card{flex:0 0 76%;max-width:310px;scroll-snap-align:start}
  .services--bento .card:first-child{grid-column:auto;grid-row:auto;justify-content:flex-start}.services--bento .card:first-child h3{font-size:1.18rem}
  .swipe{display:flex;align-items:center;gap:6px;margin:-12px 0 12px;font-size:.8rem;font-weight:700;color:var(--muted)}.swipe .ic{width:1.1em;height:1.1em}
  /* list / feature / split also become swipeable cards on a phone, so no service section reads as a plain list */
  .services--list .grid,.services--feature .stack,.services--split .rows{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin-inline:-20px;padding:6px 20px 18px;scrollbar-width:none;-webkit-overflow-scrolling:touch;grid-template-columns:none}
  .services--list .grid::-webkit-scrollbar,.services--feature .stack::-webkit-scrollbar,.services--split .rows::-webkit-scrollbar{display:none}
  .services--list .row,.services--split .row,.services--feature .stack .card{flex:0 0 76%;max-width:310px;scroll-snap-align:start;flex-direction:column;gap:12px;background:var(--surface);border:var(--card-border);border-radius:var(--r);box-shadow:var(--shadow);padding:22px;margin:0}
  .services--list .row .badge,.services--split .row .badge,.services--feature .stack .card .badge{margin:0}
  .services--list .row:first-child,.services--split .rows .row:first-child{border-top:var(--card-border)}
  .services--split .rows::before,.services--list .grid::before{content:none}
  .services--feature .sec-head{margin-bottom:12px}
  .services--list .wrap::after,.services--feature .wrap::after,.services--split .split__body::after{content:none}
  .services--split .split,.services--feature .feature,.about__grid,.faq--two-col .faq__grid,.hero__grid{grid-template-columns:minmax(0,1fr)}
  .split__body,.feature>*,.about__grid>*,.hero__grid>*{min-width:0}
  .services--split .split__media{position:static}.services--split .split__media .photo img{aspect-ratio:16/10}

  /* values: compact 2-up icon grid */
  .vgrid{grid-template-columns:1fr 1fr;gap:26px 16px}.vitem .ic{width:28px;height:28px;margin-bottom:10px}.vitem h3{font-size:1rem}.vitem p{font-size:.86rem;line-height:1.5}

  /* steps: one connected timeline whatever the desktop style */
  .process--cards .steps,.process--steps .steps{grid-template-columns:1fr;gap:26px}
  .process--cards .step,.process--steps .step{display:grid;grid-template-columns:46px 1fr;gap:18px;background:none;border:0;box-shadow:none;padding:0;position:relative}
  .process--cards .step:hover{transform:none;box-shadow:none}
  .process--cards .step__n,.process--steps .step__n{margin:0;position:relative;z-index:1}
  .process--cards .step:not(:last-child)::after,.process--steps .step:not(:last-child)::after{content:"";display:block;position:absolute;left:22px;top:48px;bottom:-26px;right:auto;width:2px;height:auto;background:var(--line)}

  /* about: photo first, bullets as chips */
  .about__media{margin:0 -20px}.about__media .photo{border-radius:0 0 28px 28px;border:0}.about__media::before{display:none}.about__media .photo img{aspect-ratio:16/11}
  .ticks{display:flex;flex-wrap:wrap;gap:8px}.ticks li{padding:8px 13px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:.88rem;align-items:center}.ticks .ic{margin-top:0}
  .about--centered .ticks{justify-content:flex-start}
  .about--centered .about__text{text-align:left}.about--centered .actions{justify-content:flex-start}

  /* mosaic */
  .gallery{padding:8px 0 20px}
  .mosaic{grid-template-columns:1fr 1fr;grid-template-rows:200px 130px;height:auto}.mosaic .m1{grid-column:1 / -1}

  /* ticker marquee */
  .ticker{overflow:hidden;padding:18px 0}.ticker .wrap{max-width:none;padding:0}
  .ticker .track{display:flex;width:max-content}
  .ticker ul,.ticker ul.dup{display:flex;flex-wrap:nowrap;justify-content:flex-start;gap:0 26px;padding:0 26px 0 0}.ticker li{white-space:nowrap;gap:26px}
  .ticker li:last-child::after{display:block}
  @media(prefers-reduced-motion:no-preference){.ticker .track{animation:marq 28s linear infinite}}

  /* faq + cta tighten */
  summary{padding:18px 18px;font-size:1rem}details p{padding:0 18px 20px}
  .cta .actions .btn{flex:1 1 100%}

  /* sticky call bar */
  .dock{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:60;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(14px);border-top:1px solid var(--line);box-shadow:0 -8px 24px rgba(20,24,40,.08)}
  .dock a{flex:1 1 0;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 12px;border-radius:var(--btn-r);font:700 .95rem var(--fb);text-decoration:none;border:2px solid var(--accent)}
  .dock__call{background:transparent;color:var(--eyebrow)}.dock__main{background:var(--accent);color:var(--accent-ink)}.dock .ic{width:1.15em;height:1.15em}
}
@media(prefers-reduced-motion:reduce){.ticker .track{animation:none}}
`;
