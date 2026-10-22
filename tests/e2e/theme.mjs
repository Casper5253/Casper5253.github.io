import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const origin = process.env.TEST_ORIGIN ?? 'http://localhost:4329/';
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
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

const toggle = page.locator('[data-theme-toggle]');

await check('night is the default: no data-theme and a field canvas', async () => {
  await page.goto(origin, { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), undefined);
  await page.waitForSelector('canvas.depth-field', { timeout: 15000 });
});

await check('the toggle switches to editorial: attribute, metas, background and no canvas', async () => {
  await toggle.click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'editorial');
  assert.equal(await toggle.getAttribute('aria-checked'), 'true');
  assert.equal(await page.evaluate(() => document.querySelector('meta[name="theme-color"]').getAttribute('content')), '#fbfaf7');
  await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(251, 250, 247)', null, { timeout: 2000 });
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(251, 250, 247)');
  await page.waitForFunction(() => !document.querySelector('canvas'), null, { timeout: 1000 });
  const stored = await page.evaluate(() => { try { return localStorage.getItem('theme'); } catch { return ''; } });
  assert.equal(stored, 'editorial');
});

await check('a reload keeps editorial and never creates a canvas', async () => {
  await page.addInitScript(() => {
    window.__canvasCount = 0;
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeName === 'CANVAS') window.__canvasCount += 1;
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'editorial');
  assert.equal(await page.evaluate(() => window.__canvasCount), 0);
  assert.equal(await page.locator('[data-theme-toggle]').getAttribute('aria-checked'), 'true');
});

await check('editorial survives navigation to /work/ and /about/', async () => {
  for (const path of ['work/', 'about/']) {
    await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'editorial', `${path} kept editorial`);
    assert.equal(await page.locator('canvas').count(), 0, `${path} has no canvas`);
  }
});

await check('a stack still opens its dialog and closes on Escape in editorial', async () => {
  await page.goto(origin, { waitUntil: 'networkidle' });
  const group = page.locator('#deliver .artifact-group').filter({ has: page.getByRole('heading', { name: 'hx and the Herdr team' }) });
  await group.scrollIntoViewIfNeeded();
  await group.locator('[data-stack-card].is-current').click();
  const dialog = group.locator('dialog');
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.evaluate((element) => element.matches(':modal')), true);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
});

await check('toggling back restores night and a fresh canvas', async () => {
  await toggle.click();
  await page.waitForFunction(() => !document.documentElement.dataset.theme, null, { timeout: 3000 });
  await page.waitForSelector('canvas.depth-field', { timeout: 15000 });
  assert.equal(await toggle.getAttribute('aria-checked'), 'false');
  assert.ok(!(await page.evaluate(() => { try { return localStorage.getItem('theme'); } catch { return 'keep'; } })), 'storage should be empty again');
});

await check('at 390x844 the toggle is visible beside the menu and the header does not overflow', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const state = await page.evaluate(() => {
    const button = document.querySelector('[data-theme-toggle]');
    const rect = button.getBoundingClientRect();
    return {
      visible: button.checkVisibility() && rect.width > 0,
      besideMenu: rect.left >= document.querySelector('.menu-toggle').getBoundingClientRect().right - 1,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      headerOverflow: document.querySelector('.site-header').scrollWidth > document.querySelector('.site-header').clientWidth,
    };
  });
  assert.equal(state.visible, true, 'toggle is not visible');
  assert.equal(state.besideMenu, true, 'toggle is not beside the menu button');
  assert.equal(state.documentOverflow, false, 'page overflows horizontally');
  assert.equal(state.headerOverflow, false, 'header overflows horizontally');
});

await check('at 320px the header and theme toggle fit without horizontal overflow', async () => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.waitForTimeout(200);
  const state = await page.evaluate(() => {
    const button = document.querySelector('[data-theme-toggle]');
    const rect = button.getBoundingClientRect();
    return {
      right: rect.right,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      themeVisible: button.checkVisibility() && rect.width > 0,
    };
  });
  assert.equal(state.themeVisible, true, 'theme toggle is not visible');
  assert.ok(state.right <= 320, `theme toggle extends past viewport: right=${state.right}`);
  assert.equal(state.documentWidth, state.viewportWidth, 'page overflows horizontally at 320px');
});

await check('field image measurement listeners do not accumulate over 20 theme toggles', async () => {
  const listenerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const listenerPage = await listenerContext.newPage();
  let releaseImages;
  const imageGate = new Promise((resolve) => { releaseImages = resolve; });
  await listenerPage.route(/\/_astro\/[^/?]+\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/, async (route) => {
    await imageGate;
    await route.continue();
  });
  try {
    await listenerPage.goto(origin, { waitUntil: 'domcontentloaded' });
    await listenerPage.waitForSelector('canvas.depth-field', { timeout: 15000 });
    const cdp = await listenerContext.newCDPSession(listenerPage);
    const listenerCount = async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: `JSON.stringify([...document.images].filter(image => !image.complete).map(image => ({ load: getEventListeners(image).load?.length || 0, error: getEventListeners(image).error?.length || 0 })))`,
        includeCommandLineAPI: true,
        returnByValue: true,
      });
      return JSON.parse(result.result.value).reduce((total, image) => total + image.load + image.error, 0);
    };
    const before = await listenerCount();
    assert.ok(before > 0, 'test needs pending images to inspect their listeners');
    const listenerToggle = listenerPage.locator('[data-theme-toggle]');
    for (let index = 0; index < 20; index += 1) {
      await listenerToggle.click();
      await listenerPage.waitForFunction(() => document.documentElement.dataset.theme === 'editorial', undefined, { timeout: 5000 });
      await listenerToggle.click();
      await listenerPage.waitForFunction(() => !document.documentElement.dataset.theme, undefined, { timeout: 5000 });
      await listenerPage.waitForSelector('canvas.depth-field', { timeout: 10000 });
    }
    const after = await listenerCount();
    await cdp.detach();
    assert.equal(after, before, `pending image listeners grew from ${before} to ${after}`);
  } finally {
    releaseImages();
    await listenerContext.close();
  }
});

await check('BFCache restore reconciles the current saved theme', async () => {
  const bfcacheBrowser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  });
  try {
    const bfcacheContext = await bfcacheBrowser.newContext({ viewport: { width: 1440, height: 900 } });
    await bfcacheContext.addInitScript(() => {
      window.__themePageShows = [];
      addEventListener('pageshow', (event) => window.__themePageShows.push(event.persisted));
    });
    const bfcachePage = await bfcacheContext.newPage();
    await bfcachePage.goto(origin, { waitUntil: 'networkidle' });
    await bfcachePage.locator('[data-theme-toggle]').click();
    await bfcachePage.waitForFunction(() => document.documentElement.dataset.theme === 'editorial');
    await bfcachePage.goto(`${origin}work/`, { waitUntil: 'networkidle' });
    await bfcachePage.locator('[data-theme-toggle]').click();
    await bfcachePage.waitForFunction(() => !document.documentElement.dataset.theme);
    await bfcachePage.evaluate(() => history.back());
    await bfcachePage.waitForFunction(() => location.pathname === '/' && window.__themePageShows.at(-1) === true, undefined, { timeout: 5000 });
    const state = await bfcachePage.evaluate(() => ({
      path: location.pathname,
      persisted: window.__themePageShows.at(-1),
      theme: document.documentElement.dataset.theme,
      stored: localStorage.getItem('theme'),
      checked: document.querySelector('[data-theme-toggle]').getAttribute('aria-checked'),
    }));
    assert.equal(state.path, new URL(origin).pathname, 'Back did not restore home');
    assert.equal(state.persisted, true, 'home was not restored from BFCache');
    assert.equal(state.stored, null, 'Night choice was not saved');
    assert.equal(state.theme, undefined, 'restored page kept the stale Paper theme');
    assert.equal(state.checked, 'false', 'restored toggle state is stale');
  } finally {
    await bfcacheBrowser.close();
  }
});

await check('switching during a held field import cannot leave a canvas in editorial', async () => {
  const racePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let releaseImport;
  let importRequested;
  const imported = new Promise((resolve) => { importRequested = resolve; });
  const gate = new Promise((resolve) => { releaseImport = resolve; });
  await racePage.route(/\/_astro\/field\.[^/]+\.js(?:\?.*)?$/, async (route) => {
    importRequested();
    await gate;
    await route.continue();
  });
  try {
    await racePage.goto(origin, { waitUntil: 'domcontentloaded' });
    await imported;
    const raceToggle = racePage.locator('[data-theme-toggle]');
    await raceToggle.click();
    await racePage.waitForFunction(() => document.documentElement.dataset.theme === 'editorial');
    await raceToggle.click();
    await racePage.waitForFunction(() => !document.documentElement.dataset.theme);
    await racePage.waitForTimeout(100);
    releaseImport();
    await racePage.waitForTimeout(500);
    await raceToggle.click();
    await racePage.waitForFunction(() => document.documentElement.dataset.theme === 'editorial');
    await racePage.waitForTimeout(250);
    assert.equal(await racePage.locator('canvas.depth-field').count(), 0, 'held import left an orphan field canvas in Paper');
  } finally {
    releaseImport();
    await racePage.close();
  }
});

await check('editorial: no stack glow and no box-shadow on prints or evidence frames', async () => {
  const editorialPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await editorialPage.goto(origin, { waitUntil: 'networkidle' });
    await editorialPage.locator('[data-theme-toggle]').click();
    await editorialPage.waitForFunction(() => document.documentElement.dataset.theme === 'editorial');
    await editorialPage.waitForTimeout(1000);

    const glowBg = await editorialPage.evaluate(() => {
      const stack = document.querySelector('.artifact-stack');
      if (!stack) return '';
      return getComputedStyle(stack, '::before').backgroundImage;
    });
    assert.ok(glowBg === 'none' || glowBg === '', `stack::before background-image should be none, got "${glowBg}"`);

    const shadows = await editorialPage.evaluate(() => {
      const elements = [
        ...document.querySelectorAll('.artifact-print'),
        ...document.querySelectorAll('.frame img'),
        ...document.querySelectorAll('.frame'),
      ];
      return elements.map((el) => ({
        tag: el.tagName,
        cls: el.className.split(' ').slice(0, 2).join('.'),
        shadow: getComputedStyle(el).boxShadow,
      }));
    });
    for (const entry of shadows) {
      assert.ok(entry.shadow === 'none', `${entry.tag}.${entry.cls} has box-shadow "${entry.shadow}" in editorial`);
    }
  } finally {
    await editorialPage.close();
  }
});

await check('editorial: stack prints are fully opaque', async () => {
  const editorialPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await editorialPage.goto(origin, { waitUntil: 'networkidle' });
    await editorialPage.locator('[data-theme-toggle]').click();
    await editorialPage.waitForFunction(() => document.documentElement.dataset.theme === 'editorial');
    await editorialPage.waitForTimeout(1000);

    const opacities = await editorialPage.evaluate(() => {
      const prints = [...document.querySelectorAll('.artifact-print')];
      return prints.map((el) => ({
        project: el.closest('[data-project]')?.getAttribute('data-project') ?? '?',
        opacity: getComputedStyle(el).opacity,
      }));
    });
    assert.ok(opacities.length > 0, 'no artifact-print elements found');
    for (const entry of opacities) {
      assert.equal(entry.opacity, '1', `print in project "${entry.project}" has opacity ${entry.opacity} in editorial`);
    }
  } finally {
    await editorialPage.close();
  }
});

await check('toggle switch: role, knob translate, word decoration, height', async () => {
  const switchPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await switchPage.goto(origin, { waitUntil: 'networkidle' });
    const toggleEl = switchPage.locator('[data-theme-toggle]');

    assert.equal(await toggleEl.getAttribute('role'), 'switch', 'toggle should have role=switch');
    assert.equal(await toggleEl.getAttribute('aria-label'), 'Paper mode', 'toggle aria-label should be "Paper mode"');
    assert.equal(await toggleEl.getAttribute('aria-checked'), 'false', 'night is default, so aria-checked=false');

    const nightState = await switchPage.evaluate(() => {
      const btn = document.querySelector('[data-theme-toggle]');
      const knob = btn.querySelector('.theme-knob');
      const words = [...btn.querySelectorAll('.theme-word')];
      return {
        knobTransform: getComputedStyle(knob).transform,
        wordDecorations: words.map((w) => getComputedStyle(w).textDecorationLine),
        height: btn.getBoundingClientRect().height,
      };
    });
    assert.ok(nightState.knobTransform === 'none' || nightState.knobTransform === '', `knob should not be translated in night, got "${nightState.knobTransform}"`);
    for (const decoration of nightState.wordDecorations) {
      assert.ok(decoration === 'none' || decoration === '', `word should have no text-decoration, got "${decoration}"`);
    }
    assert.ok(nightState.height >= 44, `switch should be at least 44px tall, got ${nightState.height.toFixed(1)}px`);

    await toggleEl.click();
    await switchPage.waitForFunction(() => document.documentElement.dataset.theme === 'editorial');
    await switchPage.waitForTimeout(500);

    const paperState = await switchPage.evaluate(() => {
      const btn = document.querySelector('[data-theme-toggle]');
      const knob = btn.querySelector('.theme-knob');
      return {
        knobTransform: getComputedStyle(knob).transform,
        checked: btn.getAttribute('aria-checked'),
      };
    });
    assert.equal(paperState.checked, 'true', 'aria-checked should be true in editorial');
    assert.ok(paperState.knobTransform !== 'none' && paperState.knobTransform !== '', `knob should translate in editorial, got "${paperState.knobTransform}"`);
  } finally {
    await switchPage.close();
  }
});

await check('toggle switch at 320px: no overflow and still 44px tall', async () => {
  const smallPage = await browser.newPage({ viewport: { width: 320, height: 844 } });
  try {
    await smallPage.goto(origin, { waitUntil: 'networkidle' });
    await smallPage.waitForTimeout(200);
    const state = await smallPage.evaluate(() => {
      const btn = document.querySelector('[data-theme-toggle]');
      return {
        height: btn.getBoundingClientRect().height,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    assert.ok(state.height >= 44, `switch should be at least 44px tall at 320px, got ${state.height.toFixed(1)}px`);
    assert.equal(state.documentWidth, state.viewportWidth, 'page overflows horizontally at 320px');
  } finally {
    await smallPage.close();
  }
});

await browser.close();
if (failures) process.exitCode = 1;
