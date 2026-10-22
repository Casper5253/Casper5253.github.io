import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const origin = process.env.TEST_ORIGIN ?? 'http://localhost:4329/';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined), headless: true });

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

const viewports = [
  { label: '1440x900', width: 1440, height: 900 },
  { label: '390x844', width: 390, height: 844 },
];

for (const vp of viewports) {
  await check(`every stack-card has a hit height >= 24px at ${vp.label}`, async () => {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      const groups = await page.locator('.artifact-group[data-artifact-plane]').all();
      assert.ok(groups.length > 0, 'no stacks found');

      for (const group of groups) {
        await group.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        const cards = await group.locator('[data-stack-card]').all();
        for (const card of cards) {
          const hitHeight = await card.evaluate((el) => el.getBoundingClientRect().height);
          assert.ok(hitHeight >= 24, `card "${await card.getAttribute('data-title')}" hit height ${hitHeight.toFixed(1)}px < 24px`);
        }
      }
    } finally {
      await page.close();
    }
  });

  await check(`clicking each card opens the dialog with that card's image at ${vp.label}`, async () => {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      const groups = await page.locator('.artifact-group[data-artifact-plane]').all();
      for (const group of groups) {
        await group.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        const cards = await group.locator('[data-stack-card]').all();
        const dialog = group.locator('dialog');
        for (const card of cards) {
          const expectedTitle = await card.getAttribute('data-title');
          const box = await card.boundingBox();
          if (!box || box.height < 1) continue;

          const isCurrent = await card.evaluate((el) => el.classList.contains('is-current'));
          if (!isCurrent) {
            await card.click({ position: { x: box.width / 2, y: box.height / 2 } });
            await page.waitForTimeout(200);
          }

          const nowCurrent = await card.evaluate((el) => el.classList.contains('is-current'));
          assert.ok(nowCurrent, `card "${expectedTitle}" did not become current after click`);

          await card.click({ position: { x: box.width / 2, y: box.height / 2 } });
          await dialog.waitFor({ state: 'visible', timeout: 5000 });

          const dialogTitle = await dialog.locator('[data-dialog-title]').textContent();
          assert.equal(dialogTitle, expectedTitle, `dialog title mismatch for "${expectedTitle}"`);

          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden', timeout: 5000 });
          await page.waitForTimeout(100);
        }
      }
    } finally {
      await page.close();
    }
  });
}

await check('single-item stacks have no stack-index buttons', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const groups = await page.locator('.artifact-group[data-artifact-plane]').all();
    assert.ok(groups.length > 0, 'no stacks found');

    for (const group of groups) {
      await group.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const cards = await group.locator('[data-stack-card]').all();
      const indexButtons = await group.locator('[data-stack-index]').all();
      if (cards.length === 1) {
        assert.equal(indexButtons.length, 0, `single-item stack "${await cards[0].getAttribute('data-title')}" has ${indexButtons.length} index buttons`);
      } else {
        assert.ok(indexButtons.length > 0, `multi-item stack has no index buttons`);
      }
    }
  } finally {
    await page.close();
  }
});

await browser.close();
if (failures) process.exitCode = 1;
