/* Icons: the model never draws SVG. It names an icon from the curated list (icons.json — Lucide, ISC
   licence) and we inline the real SVG. */
import iconData from "./icons.json";

export const ICONS = iconData.icons as Record<string, string>;
export const ICON_GROUPS = iconData.groups as Record<string, string[]>;

export function iconMenu(): string {
  return Object.entries(ICON_GROUPS).map(([g, names]) => `${g}: ${names.join(" ")}`).join("\n");
}

export const isIcon = (name: unknown): name is string => typeof name === "string" && Object.prototype.hasOwnProperty.call(ICONS, name);

export function iconSvg(name: string, extra = ""): string {
  return `<svg class="ic${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] ?? ICONS.check}</svg>`;
}

/** Swap <i class="ic" data-icon="name"></i> for the inline SVG (used when a model writes raw HTML). */
export function inlineIcons(html: string): string {
  return html.replace(/<(i|span)\b([^>]*?)\bdata-icon\s*=\s*["']([a-z0-9-]{1,40})["']([^>]*)>\s*<\/\1\s*>/gi, (_w, _t, before: string, name: string, after: string) => {
    const attrs = `${before} ${after}`;
    const cls = attrs.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    const style = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i)?.[1] ?? attrs.match(/\bstyle\s*=\s*'([^']*)'/i)?.[1];
    const extra = cls.split(/\s+/).filter((c) => c && c !== "ic" && /^[\w-]+$/.test(c)).map((c) => ` ${c}`).join("");
    const svg = iconSvg(name, extra);
    return style ? svg.replace("<svg ", `<svg style="${style.replace(/"/g, "&quot;")}" `) : svg;
  });
}
