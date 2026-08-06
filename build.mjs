/* ===========================================================================
   Static build. No dependencies. Node 18+.
   Stitches src/pages/*.html into src/layout.html, injects every value from
   site.config.mjs, and writes plain HTML to dist/. Nothing ships to the
   browser except HTML, one CSS file and one small JS file.
   =========================================================================== */

import { readFile, writeFile, mkdir, readdir, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "./site.config.mjs";
import { faqs } from "./src/content/faq.mjs";
import { included } from "./src/content/included.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const dist = join(root, "dist");

const read = (p) => readFile(join(src, p), "utf8");
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* --- derived config ----------------------------------------------------- */

const whatsappUrl =
  `https://wa.me/${config.whatsappNumber}?text=` +
  encodeURIComponent(config.whatsappPrefill);

const globals = {
  ...config,
  whatsappUrl,
  year: new Date().getFullYear(),
  counterValue: String(config.counterValue),
};

/* --- generated blocks ---------------------------------------------------- */

function faqAccordion(list) {
  const items = list
    .map(
      (f) => `      <details>
        <summary>${f.q}<span class="faq__sign" aria-hidden="true"></span></summary>
        <div class="faq__body">${f.a.map((p) => `<p>${p}</p>`).join("")}</div>
      </details>`
    )
    .join("\n");
  return `<div class="faq rise">\n${items}\n    </div>`;
}

function faqJsonLd(list) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: list.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a.join(" ").replace(/\{\{renewalPrice\}\}/g, config.renewalPrice),
      },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

const businessJsonLd = `<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Web99.ie",
  description:
    "A Dublin web design studio that builds a complete website for any small business for €99. See the finished website live before paying.",
  url: config.domain,
  areaServed: "IE",
  address: { "@type": "PostalAddress", addressLocality: "Dublin", addressCountry: "IE" },
  email: config.email,
  offers: {
    "@type": "Offer",
    price: "99",
    priceCurrency: "EUR",
    description: "Complete website, free domain and hosting for one year, ready in 24 hours.",
  },
})}</script>`;

/* The receipt. Rows and total both come from config.valueStack, so the
   total is arithmetic rather than a number somebody has to remember. */
function receiptRows() {
  return config.valueStack
    .map(
      (r) =>
        `      <div class="rrow"><span class="rrow__name">${r.item}</span>` +
        `<span class="rrow__dots"></span>` +
        `<span class="rrow__val">€${r.value.toLocaleString("en-IE")}</span></div>`
    )
    .join("\n");
}

function totalValue() {
  const sum = config.valueStack.reduce((t, r) => t + r.value, 0);
  return "€" + sum.toLocaleString("en-IE");
}

/* The hero card. Same valueStack source as the pricing receipt, so the two
   can never disagree. */
function heroCard() {
  const rows = config.valueStack
    .map(
      (r) =>
        `        <div class="rrow"><span class="rrow__name">${r.item}</span>` +
        `<span class="rrow__dots"></span>` +
        `<span class="rrow__val">€${r.value.toLocaleString("en-IE")}</span></div>`
    )
    .join("\n");

  return `<div class="receipt receipt--hero">
        <div class="receipt__head">
          <strong>What's included</strong>
          <span>And what it would normally cost you</span>
        </div>

${rows}

        <hr />

        <p class="rtotal"><span>Total value</span><span>${totalValue()}</span></p>
        <p class="rpay"><span class="rpay__label">You pay</span><span class="rpay__fig">€99</span></p>

        <a class="btn btn--block receipt__cta" href="/start/">Start building <svg class="btn__arrow" width="19" height="19" aria-hidden="true"><use href="#i-arrow"/></svg></a>
        <p class="micro receipt__micro">No credit card. You only pay once you've seen it.</p>
      </div>`;
}

function inclusionList(list, extraClass) {
  const items = list
    .map(
      (i) => `        <li class="incl__item">
          <span class="incl__ic"><svg width="22" height="22" aria-hidden="true"><use href="#${i.icon}"/></svg></span>
          <div><h3 class="h3">${i.title}</h3><p>${i.line}</p></div>
        </li>`
    )
    .join("\n");
  return `<ul class="incl${extraClass ? " " + extraClass : ""}">\n${items}\n      </ul>`;
}

function counterBand() {
  if (!config.counterEnabled) return "<!-- counter band switched off in site.config.mjs -->";
  return `<section class="counter" aria-label="Businesses brought online">
  <span class="dots" aria-hidden="true"></span>
  <div class="wrap">
    <p class="counter__fig" data-count-to="${esc(config.counterValue)}">${esc(config.counterValue)}</p>
    <p class="counter__lbl">${esc(config.counterLabel)}</p>
  </div>
</section>`;
}

function testimonialBlock() {
  const t = config.testimonials;
  const body = t.length
    ? t
        .map(
          (x) => `      <figure class="tcard">
        <blockquote>${esc(x.quote)}</blockquote>
        <cite>${esc(x.name)}<small>${esc(x.business)}${x.town ? ", " + esc(x.town) : ""}</small></cite>
      </figure>`
        )
        .join("\n")
    : Array.from({ length: 3 })
        .map(
          () => `      <div class="tslot" aria-hidden="true">
        <span class="tslot__mark">&ldquo;</span>
        <span>Reserved for a real customer. Nothing goes here until somebody has actually said it.</span>
      </div>`
        )
        .join("\n");

  return `<section class="section section--tight">
  <div class="wrap">
    <div class="section-head section-head--center rise">
      <p class="eyebrow eyebrow--center">In their own words</p>
      <h2 class="h2">What Irish business owners say.</h2>
    </div>
    <div class="tslots rise">
${body}
    </div>
  </div>
</section>`;
}

function heroImage() {
  if (config.heroImage) {
    return `<img src="${esc(config.heroImage)}" alt="${esc(config.heroImageAlt)}" width="720" height="790" fetchpriority="high" decoding="async" />`;
  }
  return `<!-- Hero photograph slot. Set heroImage in site.config.mjs to replace this. -->
        <div class="photoslot">
          <svg width="46" height="46" aria-hidden="true"><use href="#i-camera"/></svg>
          <p>Hero photograph goes here — a real Irish business owner, at work, on their phone.</p>
        </div>`;
}

/* --- page assembly -------------------------------------------------------- */

/* Front matter lives in an HTML comment at the top of each page:
   <!--@ title: ...
        description: ... --> */
function frontMatter(raw) {
  const m = raw.match(/^<!--@([\s\S]*?)-->/);
  if (!m) return [{}, raw];
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^\s*([a-zA-Z]+):\s*(.+?)\s*$/);
    if (kv) meta[kv[1]] = kv[2];
  }
  return [meta, raw.slice(m[0].length)];
}

/* Canonical URLs match the emitted directory-per-route shape exactly. */
function normalisePath(declared, file) {
  const slug = file.replace(/\.html$/, "");
  if (slug === "index") return "/";
  const base = declared || "/" + slug;
  return base === "/" ? "/" : base.replace(/\/$/, "") + "/";
}

function fill(str, map) {
  return str.replace(/\{\{(\w+)\}\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(map, key) ? map[key] : whole
  );
}

async function build() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  const [layout, header, footer, sprite, arcHero, arcFinale] = await Promise.all([
    read("layout.html"),
    read("partials/header.html"),
    read("partials/footer.html"),
    read("partials/sprite.html"),
    read("partials/arc-hero.html"),
    read("partials/arc-finale.html"),
  ]);

  const blocks = {
    header: fill(header, globals),
    footer: fill(footer, globals),
    sprite,
    arcHero,
    arcFinale,
    counterBand: counterBand(),
    testimonialBlock: testimonialBlock(),
    heroCard: heroCard(),
    receiptRows: receiptRows(),
    totalValue: totalValue(),
    includedTop: inclusionList(included.filter((i) => i.top)),
    includedRest: inclusionList(included.filter((i) => !i.top), "incl--rest"),
    includedAll: inclusionList(included),
    faqList: faqAccordion(faqs.filter((f) => f.home)),
    faqListAll: faqAccordion(faqs),
  };

  const pages = (await readdir(join(src, "pages"))).filter((f) => f.endsWith(".html"));
  const routes = [];

  for (const file of pages) {
    const raw = await read(join("pages", file));
    const [meta, content] = frontMatter(raw);

    const isFaqPage = file === "faq.html";
    const jsonld =
      (file === "index.html" ? businessJsonLd : "") +
      (file === "index.html" ? faqJsonLd(faqs.filter((f) => f.home)) : "") +
      (isFaqPage ? faqJsonLd(faqs) : "");

    const map = {
      ...globals,
      ...blocks,
      title: meta.title || "Web99.ie",
      description: meta.description || "",
      ogTitle: meta.ogTitle || meta.title || "Web99.ie",
      ogDescription: meta.ogDescription || meta.description || "",
      path: normalisePath(meta.path, file),
      jsonld,
      content: "",
    };

    /* two passes: content tokens first, then the page inside the layout */
    map.content = fill(fill(content, map), map);
    const html = fill(fill(layout, map), map);

    /* Directory-per-route: "/pricing/index.html". Works unchanged on GitHub
       Pages, Vercel, Netlify or a plain file server — no rewrite rules. */
    const slug = file.replace(/\.html$/, "");
    const outPath =
      slug === "index" || slug === "404"
        ? join(dist, file)
        : join(dist, slug, "index.html");

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html.trimStart() + "\n", "utf8");
    if (slug !== "404") routes.push(map.path);
    process.stdout.write(`  ${map.path}\n`);
  }

  /* assets + favicon */
  await cp(join(src, "assets"), join(dist, "assets"), { recursive: true });
  if (existsSync(join(src, "favicon.svg"))) {
    await cp(join(src, "favicon.svg"), join(dist, "favicon.svg"));
  }

  /* sitemap + robots, generated from the routes we actually built */
  const today = new Date().toISOString().slice(0, 10);
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    routes
      .sort()
      .map(
        (r) =>
          `  <url><loc>${config.domain}${r}</loc>` +
          `<lastmod>${today}</lastmod>` +
          `<priority>${r === "/" ? "1.0" : "0.7"}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>\n`;
  await writeFile(join(dist, "sitemap.xml"), sitemap, "utf8");
  await writeFile(
    join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${config.domain}/sitemap.xml\n`,
    "utf8"
  );

  /* GitHub Pages otherwise runs the output through Jekyll */
  await writeFile(join(dist, ".nojekyll"), "", "utf8");

  console.log(`\nBuilt ${pages.length} pages -> dist/`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
