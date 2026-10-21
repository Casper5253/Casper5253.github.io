// Regenerates public/og.png (1200 x 630) from the site identity: night palette, the name in the
// grotesque, the thesis in Georgia, and five chapter markers in the chapter accents.
// Run: node scripts/og.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const output = fileURLToPath(new URL('../public/og.png', import.meta.url));

// The thesis is read from profile.ts so the image cannot drift from the site.
const profileSrc = await readFile(new URL('../src/data/profile.ts', import.meta.url), 'utf8');
const thesis = profileSrc.match(/thesis:\s*\n?\s*'((?:[^'\\]|\\.)*)'/)?.[1].replace(/\\'/g, "'")
  ?? 'Someone describes a thing they wish existed. I work out what they actually need, build it so it really works, and stay with it until it is useful.';

// Chapter accents come from tokens.css (data-chapter blocks), so the image cannot drift from the site.
const css = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const accents = [...css.matchAll(/\[data-tone='(\w+)'\]\s*\{\s*--accent:\s*(#[0-9a-f]{6})/g)].map(([, , hex]) => hex);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    background: #0d0e12;
    color: #f3eee4;
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 96px;
  }
  .name {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .thesis {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 40px;
    line-height: 1.35;
    letter-spacing: -0.01em;
    max-width: 21em;
    margin-top: 28px;
  }
  .chapters {
    position: absolute;
    left: 96px;
    bottom: 64px;
    display: flex;
    gap: 18px;
  }
  .chapters span {
    width: 22px;
    height: 22px;
    border-radius: 50%;
  }
</style>
</head>
<body>
  <p class="name">Casper van Tongeren</p>
  <p class="thesis">${thesis}</p>
  <div class="chapters" aria-hidden="true">
    ${accents.map((hex) => `<span style="background: ${hex}"></span>`).join('\n    ')}
  </div>
</body>
</html>`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: output, type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
} finally {
  await browser.close();
}
console.log(`wrote ${output}`);
