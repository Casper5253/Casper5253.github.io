// Captures the article openings and selected figures from the published reading pages in public/writing/
// at 2x pixel density, as light documents, into src/assets/. Run after editing an article: node scripts/capture-articles.mjs
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const ARTICLES = [
  { id: 'hx', figures: { 1: 'hx-figure-1', 3: 'hx-figure-3', 4: 'hx-figure-4', 6: 'hx-figure-6' } },
  { id: 'quantlab', figures: { 1: 'quantlab-figure-1', 2: 'quantlab-figure-2' } },
];

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce' });
for (const { id, figures } of ARTICLES) {
  const out = (name) => fileURLToPath(new URL(`src/assets/${id}/${name}.png`, root));
  await page.goto(pathToFileURL(fileURLToPath(new URL(`public/writing/${id}/index.html`, root))).href, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'body > a[href="../../"]{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: out(`${id}-article-top`) });
  const all = page.locator('figure');
  for (const [n, name] of Object.entries(figures)) {
    const figure = all.nth(Number(n) - 1);
    await figure.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await figure.screenshot({ path: out(name) });
    console.log(out(name));
  }
}
await browser.close();
