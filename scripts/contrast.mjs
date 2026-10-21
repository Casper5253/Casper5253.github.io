// Checks the night palette against WCAG 2.2: body text needs 4.5:1 on every chapter's paper and tint,
// accents (used for labels and links) need 4.5:1 on their own chapter's paper and tint.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.trim(),
  vars: Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]])),
}));
const root = blocks.find((b) => b.selector === ':root').vars;
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

let failed = 0;
const check = (label, fg, bg, min) => {
  const r = ratio(fg, bg);
  if (r < min) { failed++; console.log(`FAIL ${label}: ${r.toFixed(2)} < ${min}`); }
};
const chapters = blocks.filter((b) => b.selector.includes('data-chapter'));
for (const { selector, vars } of chapters) {
  for (const bg of ['paper', 'tint']) {
    for (const fg of ['ink', 'muted', 'quiet']) check(`${fg} on ${bg} ${selector}`, root[fg], vars[bg], 4.5);
    check(`accent on ${bg} ${selector}`, vars.accent, vars[bg], 4.5);
  }
}
console.log(failed ? `${failed} contrast failures` : `contrast ok: ${chapters.length} chapter palettes`);
process.exit(failed ? 1 : 0);
