/* Logos for generated sites, drawn by code (no model call, no image).

   Each style combines a small SVG mark (monogram in a shield, icon in a hexagon, an arch, a ring…) or a
   typographic treatment (stacked caps with rules, a framed name, a two-tone name with a swoosh) with the
   site's own palette and heading font. Colours come only from CSS variables, so the same logo works on the
   light header and the dark footer. The mark is decoration: the business name is always real, escaped text next to it. */
import { iconSvg } from "./icons";

export const LOGO_STYLES = ["badge", "monogram", "tagline", "shield", "hex", "emblem", "arch", "duo", "ring", "stacked", "framed", "swoosh"] as const;
export type LogoStyle = (typeof LOGO_STYLES)[number];

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const SKIP_WORDS = new Set(["the", "and", "of", "ltd", "limited", "co", "&", "a"]);
export function initials(name: string): string {
  const words = name.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter((w) => w && !SKIP_WORDS.has(w.toLowerCase()));
  const letters = (words.length > 1 ? words.slice(0, 2).map((w) => w[0]) : [words[0]?.[0] ?? name[0] ?? "W"]).join("");
  return letters.toUpperCase();
}

/** The icon, placed inside a 48x48 mark at a given spot and size. */
const inner = (name: string, x: number, y: number, size: number, cls = "lg-ic") =>
  iconSvg(name).replace("<svg ", `<svg x="${x}" y="${y}" width="${size}" height="${size}" `).replace('class="ic"', `class="${cls}"`);

const svg = (body: string, label = "") => `<svg class="lg" viewBox="0 0 48 48" width="52" height="52" role="img" aria-label="${esc(label)}" focusable="false">${body}</svg>`;

/* Colour roles (set in CSS, switched for the dark footer):
   --lg-fill  solid shapes        --lg-ink   text/icons on those shapes
   --lg-line  outlines            --lg-text  accent-coloured text/icons on the page background */
function mark(style: LogoStyle, name: string, iconName: string): string {
  const ini = esc(initials(name));
  const t = (size = 17, y = 30) => `<text class="lg-t" x="24" y="${y}" text-anchor="middle" style="font-size:${size}px">${ini}</text>`;
  switch (style) {
    case "shield":
      return svg(`<path class="lg-fill" d="M24 2.5 42.5 8.5v14.2c0 11.4-7.7 19.7-18.5 23.3C13.2 42.4 5.5 34.1 5.5 22.7V8.5Z"/><path d="M24 7.5 38 12v10.5c0 8.6-5.7 14.9-14 18-8.3-3.1-14-9.4-14-18V12Z" fill="none" stroke="var(--lg-ink)" stroke-opacity=".35" stroke-width="1.2"/>${t(ini.length > 1 ? 15 : 19, 29)}`, name);
    case "hex":
      return svg(`<path d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" fill="none" stroke="var(--lg-line)" stroke-width="3" stroke-linejoin="round"/>${inner(iconName, 13, 13, 22, "lg-ic lg-ic--text")}`, name);
    case "emblem":
      return svg(`<circle class="lg-fill" cx="24" cy="24" r="22"/><circle cx="24" cy="24" r="18" fill="none" stroke="var(--lg-ink)" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="2 3"/>${inner(iconName, 12.5, 12.5, 23)}`, name);
    case "arch":
      return svg(`<path class="lg-fill" d="M6 45V22C6 11.5 14 3.5 24 3.5S42 11.5 42 22v23Z"/><path d="M12 45V22.5C12 14.8 17.3 9.5 24 9.5s12 5.3 12 13V45" fill="none" stroke="var(--lg-ink)" stroke-opacity=".4" stroke-width="1.2"/>${inner(iconName, 13, 17, 22)}`, name);
    case "duo": {
      const [first, second] = [...initials(name)];
      return svg(`<rect x="3" y="3" width="42" height="42" rx="9" fill="var(--lg-dark)"/><path class="lg-fill" d="M3 12a9 9 0 0 1 9-9h33L3 45Z"/><text class="lg-t" x="15" y="21" text-anchor="middle" style="font-size:16px">${esc(first ?? "W")}</text><text class="lg-t lg-t--ondark" x="33" y="39" text-anchor="middle" style="font-size:16px">${esc(second ?? "")}</text>${second ? "" : '<circle cx="34" cy="34" r="3.5" style="fill:var(--lg-on-dark)"/>'}`, name);
    }
    case "ring":
      return svg(`<circle cx="24" cy="24" r="21" fill="none" stroke="var(--lg-line)" stroke-width="3"/><text class="lg-t lg-t--text" x="24" y="30" text-anchor="middle" style="font-size:${ini.length > 1 ? 17 : 21}px">${ini}</text>`, name);
    default:
      return "";
  }
}

/** The whole logo link (header and footer). `tagline` is shown under the name by the "tagline" and "stacked" styles. */
export function logoHtml(c: { name: string; tagline: string; icon: string }, style: string): string {
  const s: LogoStyle = (LOGO_STYLES as readonly string[]).includes(style) ? (style as LogoStyle) : "badge";
  const name = esc(c.name);
  const tag = c.tagline ? `<small>${esc(c.tagline)}</small>` : "";
  const label = `<span class="logo__name">${name}</span>`;

  switch (s) {
    case "badge":
      return `<a class="logo logo--badge" href="#top"><span class="logo__mark">${iconSvg(c.icon)}</span><span>${label}</span></a>`;
    case "monogram":
      return `<a class="logo logo--monogram" href="#top"><span class="logo__mark">${esc(initials(c.name))}</span><span>${label}</span></a>`;
    case "tagline":
      return `<a class="logo logo--tagline" href="#top"><span class="logo__mark">${iconSvg(c.icon)}</span><span>${label}${tag}</span></a>`;
    case "stacked":
      return `<a class="logo logo--stacked" href="#top"><span class="logo__stack"><span class="logo__rule" aria-hidden="true"></span>${label}${c.tagline ? `<small>${esc(c.tagline)}</small>` : ""}<span class="logo__rule" aria-hidden="true"></span></span></a>`;
    case "framed":
      return `<a class="logo logo--framed" href="#top"><span class="logo__frame">${iconSvg(c.icon)}${label}</span></a>`;
    case "swoosh": {
      const words = c.name.split(/\s+/);
      const first = words.length > 1 ? esc(words.slice(0, -1).join(" ")) : "";
      const last = esc(words[words.length - 1] ?? c.name);
      return `<a class="logo logo--swoosh" href="#top"><span class="logo__mark logo__mark--bare">${iconSvg(c.icon)}</span><span class="logo__name">${first ? `${first} ` : ""}<span class="logo__accent">${last}</span><svg class="logo__swoosh" viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M1 6.5C30 1.5 80 1 119 4.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></span></a>`;
    }
    default:
      return `<a class="logo logo--${s}" href="#top"><span class="logo__svg">${mark(s, c.name, c.icon)}</span><span>${label}${s === "emblem" ? tag : ""}</span></a>`;
  }
}

export const LOGO_CSS = `
.logo{--lg-fill:var(--accent);--lg-ink:var(--accent-ink);--lg-line:var(--accent);--lg-text:var(--eyebrow);--lg-dark:var(--ink);--lg-on-dark:var(--bg)}
.ftr .logo{--lg-fill:var(--accent-on-dark);--lg-ink:var(--dark);--lg-line:var(--accent-on-dark);--lg-text:var(--accent-on-dark);--lg-dark:var(--dark-ink);--lg-on-dark:var(--dark)}
.logo__svg{display:grid;place-items:center;flex:none;line-height:0}.lg{display:block;overflow:visible}
.lg .lg-fill{fill:var(--lg-fill)}.lg .lg-t{fill:var(--lg-ink);font-family:var(--fh);font-weight:800;letter-spacing:.01em}.lg .lg-t--text{fill:var(--lg-text)}.lg .lg-t--ondark{fill:var(--lg-on-dark)}
.lg .lg-ic{color:var(--lg-ink)}.lg .lg-ic--text{color:var(--lg-text)}
.logo--shield .lg,.logo--hex .lg,.logo--emblem .lg,.logo--arch .lg,.logo--duo .lg,.logo--ring .lg{filter:drop-shadow(0 4px 8px color-mix(in srgb,var(--accent) 28%,transparent))}
.ftr .logo .lg{filter:none}
.logo--emblem small{letter-spacing:.14em;text-transform:uppercase;font-size:.62rem;font-weight:700}
.logo--stacked .logo__stack{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center}
.logo--stacked .logo__name{text-transform:uppercase;letter-spacing:.2em;font-size:1.02rem;font-weight:800;padding-left:.2em}
.logo--stacked small{font:600 .6rem/1.2 var(--fb);letter-spacing:.22em;text-transform:uppercase;color:var(--muted);margin:0}
.logo--stacked .logo__rule{display:block;width:100%;height:2px;background:linear-gradient(90deg,transparent,var(--lg-line) 18%,var(--lg-line) 82%,transparent)}
.ftr .logo--stacked small{color:color-mix(in srgb,var(--dark-ink) 65%,transparent)}
.logo--framed .logo__frame{display:inline-flex;align-items:center;gap:10px;padding:8px 14px;border:2px solid var(--lg-line);border-radius:calc(var(--r) * .5);color:var(--ink)}
.ftr .logo--framed .logo__frame{color:var(--dark-ink)}
.logo--framed .ic{width:22px;height:22px;color:var(--lg-text)}
.logo--framed .logo__name{text-transform:uppercase;letter-spacing:.1em;font-size:1rem;font-weight:800}
.logo--swoosh .logo__mark--bare{width:auto;height:auto;background:none;box-shadow:none;color:var(--lg-text)}.logo--swoosh .logo__mark--bare .ic{width:30px;height:30px}
.logo--swoosh .logo__name{position:relative;display:inline-block;padding-bottom:8px}
.logo--swoosh .logo__accent{color:var(--lg-text)}
.logo__swoosh{position:absolute;left:0;right:0;bottom:0;width:100%;height:7px;color:var(--lg-text)}
@media(max-width:480px){.lg{width:44px;height:44px}.logo--stacked .logo__name{font-size:.9rem;letter-spacing:.14em}.logo--framed .logo__frame{padding:6px 10px}.logo--framed .logo__name{font-size:.9rem}}
`;
