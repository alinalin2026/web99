/* Every text/background pairing a palette tells the model to use must be readable (WCAG AA or better). */
import assert from "node:assert/strict";
import { test } from "node:test";
import { palettes, pickPalette, paletteInstructions, STYLE_MODES } from "../lib/palettes.ts";

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test("every palette pairing is readable", () => {
  const bad = [];
  for (const p of palettes) {
    const check = (fg, bg, min, label) => { if (ratio(fg, bg) < min) bad.push(`${p.id}: ${label} ${ratio(fg, bg).toFixed(2)} < ${min}`); };
    check(p.ink, p.bg, 7, "ink on bg");
    check(p.ink, p.surface, 7, "ink on surface");
    check(p.muted, p.bg, 4.5, "muted on bg");
    check(p.muted, p.surface, 4.5, "muted on surface");
    check(p.accentInk, p.accent, 4.5, "accent-ink on accent");
    check(p.darkInk, p.dark, 7, "dark-ink on dark");
    check(p.accent, p.bg, 3, "accent on bg (icons, big type)");
  }
  assert.deepEqual(bad, []);
});

test("ids are unique, every mode has a palette, every style maps to existing modes", () => {
  assert.equal(new Set(palettes.map((p) => p.id)).size, palettes.length);
  for (const m of ["light", "soft", "bold", "dark"]) assert.ok(palettes.some((p) => p.mode === m), m);
  for (const modes of Object.values(STYLE_MODES)) for (const m of modes) assert.ok(palettes.some((p) => p.mode === m));
});

test("pickPalette respects the style's mode and avoids palettes already seen", () => {
  assert.ok(pickPalette("darker").mode === "dark");
  const seen = palettes.filter((p) => p.mode === "dark").slice(0, 2).map((p) => p.id);
  for (let i = 0; i < 20; i++) assert.ok(!seen.includes(pickPalette("darker", seen).id));
  const all = palettes.filter((p) => p.mode === "dark").map((p) => p.id);
  assert.ok(pickPalette("darker", all)); // all seen: still returns one
});

test("prompt text lists every palette (or just the forced one)", () => {
  const all = paletteInstructions();
  for (const p of palettes) assert.ok(all.includes(p.id));
  const one = paletteInstructions(palettes[0]);
  assert.ok(one.includes(palettes[0].id) && !one.includes(palettes[1].id));
});
