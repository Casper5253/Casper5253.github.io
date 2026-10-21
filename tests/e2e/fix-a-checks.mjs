import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const origin = 'http://localhost:4329/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

let failures = 0;
const check = async (name, run) => {
  try {
    await run();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stdout.write(`FAIL ${name}: ${error.message}\n`);
  }
};

await check('skip link is visible and topmost after first Tab at 1440 and 390', async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.activeElement === document.body), true, 'focus should start on body');
    await page.keyboard.press('Tab');
    const state = await page.evaluate(() => {
      const link = document.querySelector('.skip-link');
      if (document.activeElement !== link) return { focused: false };
      const rect = link.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { focused: true, topmost: top === link || link.contains(top), topTag: top?.className ?? String(top) };
    });
    assert.equal(state.focused, true, `${viewport.width}px Tab should focus the skip link`);
    assert.equal(state.topmost, true, `${viewport.width}px skip link is covered by ${state.topTag}`);
    await page.keyboard.press('Escape');
  }
});

await check('every case-study body column is at least 300px wide at 390', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  const slugs = readdirSync(new URL('../../src/content/projects/', import.meta.url))
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3));
  for (const slug of slugs) {
    await page.goto(`${origin}work/${slug}/`, { waitUntil: 'networkidle' });
    const widths = await page.evaluate(() => [...document.querySelectorAll('.case-main .case-section > *:not(h2)')]
      .map((element) => element.getBoundingClientRect().width));
    assert.ok(widths.length > 0, `${slug} has no case sections`);
    const narrow = Math.min(...widths);
    assert.ok(narrow >= 300, `${slug} body column is only ${narrow}px wide`);
  }
});

await browser.close();
if (failures) process.exitCode = 1;
