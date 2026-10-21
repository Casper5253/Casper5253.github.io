import { chromium, firefox, webkit } from 'playwright-core';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const origin = 'http://localhost:4329';
const out = new URL('../../.artifacts/p4-verify/', import.meta.url);
await mkdir(out, { recursive: true });
const report = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), browsers: [], routes: [], checks: [], links: [] };
const interactionsOnly = process.argv.includes('--interactions-only');
if (interactionsOnly) {
  const previous = JSON.parse(await readFile(new URL('stage-2-results.json', out), 'utf8'));
  report.routes = previous.routes;
  report.routeCommit = previous.routeCommit || previous.commit;
  report.links = previous.links;
}
const routes = [];
async function collect(dir = 'dist', prefix = '') {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.isDirectory()) { if (item.name !== '_astro') await collect(`${dir}/${item.name}`, `${prefix}/${item.name}`); }
    else if (item.name.endsWith('.html')) routes.push(item.name === 'index.html' ? `${prefix}/` : `${prefix}/${item.name}`);
  }
}
await collect();
const links = new Set(report.links);
async function check(browser, width, name, action) {
  try { const evidence = await action(); report.checks.push({ browser, width, name, pass: true, evidence }); }
  catch (error) { report.checks.push({ browser, width, name, pass: false, error: error.message }); }
  await writeFile(new URL('stage-2-results.json', out), JSON.stringify(report, null, 2));
  console.log(`${browser} ${width} ${name}: ${report.checks.at(-1).pass ? 'PASS' : 'FAIL ' + report.checks.at(-1).error}`);
}
for (const [name, engine, options] of [['edge', chromium, { channel: 'msedge' }], ['chrome', chromium, { channel: 'chrome' }], ['firefox', firefox, {}], ['webkit', webkit, {}]]) {
  let browser;
  try { browser = await engine.launch({ ...options, headless: true }); }
  catch (error) { report.browsers.push({ name, error: error.message }); continue; }
  report.browsers.push({ name, version: browser.version() });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, deviceScaleFactor: width === 390 ? 3 : 1 });
      context.setDefaultTimeout(5000);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return url.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) ? route.continue() : route.abort();
      });
      for (const path of interactionsOnly ? [] : routes) {
        const page = await context.newPage();
        const errors = [], failedLocal = [], badResponses = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('requestfailed', request => { if (request.url().startsWith(origin)) failedLocal.push({ url: request.url(), error: request.failure() }); });
        page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400 && response.request().resourceType() !== 'document') badResponses.push({ url: response.url(), status: response.status() }); });
        await page.addInitScript(() => {
          window.shifts = [];
          if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) new PerformanceObserver(list => {
            for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.shifts.push(entry.value);
          }).observe({ type: 'layout-shift', buffered: true });
        });
        const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(path.startsWith('/writing/') ? 1200 : 120);
        const details = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
          h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length,
          cls: PerformanceObserver.supportedEntryTypes.includes('layout-shift') ? window.shifts.reduce((sum, value) => sum + value, 0) : null,
          fonts: performance.getEntriesByType('resource').filter(resource => /fonts\.(?:googleapis|gstatic)\.com/.test(resource.name)).map(resource => resource.name),
          links: [...document.querySelectorAll('a[href]')].map(link => link.href).filter(href => /^https?:/.test(href) && !href.startsWith(location.origin)),
          overflow: [...document.querySelectorAll('body *')].filter(element => { const rect = element.getBoundingClientRect(); return rect.width && rect.right > innerWidth + 2 && getComputedStyle(element).position !== 'fixed'; }).slice(0, 8).map(element => ({ tag: element.tagName, cls: element.className, text: element.textContent?.trim().slice(0, 80) })),
        }));
        details.links.forEach(link => links.add(link));
        report.routes.push({ browser: name, width, path, status: response.status(), ...details, errors, failedLocal, badResponses });
        await writeFile(new URL('stage-2-results.json', out), JSON.stringify(report, null, 2));
        console.log(`${name} ${width} route ${path}`);
        if (path === '/' || path.startsWith('/writing/')) await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}-${path.replaceAll('/', '-') || 'home'}.png`, out)) });
        await page.close();
      }
      const page = await context.newPage();
      await page.goto(origin, { waitUntil: 'networkidle' });
      await check(name, width, 'project appears in exactly one chapter', async () => {
        const appearances = await page.locator('.artifact-group,.concept-diagram,.project-card').evaluateAll(elements => elements.map(element => ({ project: element.dataset.project, chapter: element.closest('.chapter')?.id })));
        const groups = Object.groupBy(appearances, value => value.project);
        assert.ok(appearances.length > 0);
        for (const [project, list] of Object.entries(groups)) {
          assert.notEqual(project, 'undefined'); assert.ok(list.every(value => value.chapter));
          assert.equal(new Set(list.map(value => value.chapter)).size, 1, `${project} spans multiple chapters`);
        }
        return groups;
      });
      await check(name, width, 'home scroll across all chapters', async () => {
        await page.waitForSelector('canvas.depth-field[data-first-frame-at]');
        const chapters = [];
        for (const id of ['opening', 'understand', 'build', 'refine', 'deliver', 'learn']) {
          await page.evaluate(id => document.getElementById(id).scrollIntoView({ behavior: 'instant' }), id);
          await page.waitForFunction(id => document.documentElement.dataset.chapter === id, id);
          chapters.push(id); await page.waitForTimeout(80);
        }
        return chapters;
      });
      const stackCount = await page.locator('.artifact-group[data-artifact-plane]').count();
      for (let groupIndex = 0; groupIndex < stackCount; groupIndex++) {
        await check(name, width, `stack ${groupIndex} all item inputs and dialogs`, async () => {
          const group = page.locator('.artifact-group[data-artifact-plane]').nth(groupIndex);
          const cards = group.locator('[data-stack-card]');
          const indices = group.locator('[data-stack-index]');
          const count = await cards.count();
          const project = await group.getAttribute('data-project');
          const actions = [];
          for (let i = 0; i < count; i++) {
            await indices.nth(0).click();
            const exposed = parseFloat(await cards.nth(i).evaluate(element => getComputedStyle(element).getPropertyValue('--hit-height'))) > 0;
            if (exposed) {
              await cards.nth(i).click();
              if (i === 0) { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog[open]')); }
            } else await indices.nth(i).click();
            assert.ok(await cards.nth(i).evaluate(element => element.classList.contains('is-current')));
            await indices.nth(i).click();
            assert.equal(await indices.nth(i).getAttribute('aria-pressed'), 'true');
            await indices.nth((i + count - 1) % count).focus();
            await page.keyboard.press('ArrowRight');
            assert.equal(await indices.nth(i).getAttribute('aria-pressed'), 'true');
            await indices.nth((i + 1) % count).focus();
            await page.keyboard.press('ArrowLeft');
            assert.equal(await indices.nth(i).getAttribute('aria-pressed'), 'true');
            const image = cards.nth(i).locator('img');
            await image.scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
            const rect = await image.boundingBox();
            await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
            const dialog = group.locator('dialog');
            assert.ok(await dialog.evaluate(element => element.open), `${project} item ${i} image centre opens`);
            await group.locator('[data-dialog-image]').evaluate(image => image.decode());
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.querySelector('dialog[open]'));
            await page.waitForFunction(([groupIndex, i]) => document.querySelectorAll('.artifact-group[data-artifact-plane]')[groupIndex].querySelectorAll('[data-stack-card]')[i] === document.activeElement, [groupIndex, i]);
            actions.push({ title: await cards.nth(i).getAttribute('data-title'), cardExposed: exposed });
          }
          if (count > 1) {
            await indices.nth(0).click();
            await indices.nth(0).focus(); await page.keyboard.press('Shift+Tab');
            await cards.nth(1).focus();
            await page.waitForTimeout(200);
            await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}-focus-${project}.png`, out)) });
          }
          return { project, count, actions };
        });
      }
      if (width === 390) for (const path of ['/', '/work/', '/work/hx/', '/about/', '/archive/']) {
        await page.goto(origin + path, { waitUntil: 'networkidle' });
        await check(name, width, `menu Tab ${path}`, async () => {
          const menu = page.getByRole('button', { name: 'Menu', exact: true });
          await menu.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
          const result = await page.evaluate(() => ({ text: document.activeElement?.textContent, inMenu: !!document.activeElement?.closest('.text-nav') }));
          if (!result.inMenu && name === 'webkit') {
            const fixture = await context.newPage();
            await fixture.setContent('<button id="before">Before</button><a href="#link">Link</a><button id="after">After</button>');
            await fixture.locator('#before').focus(); await fixture.keyboard.press('Tab');
            assert.equal(await fixture.evaluate(() => document.activeElement.id), 'after', 'WebKit must also skip the link in a plain fixture');
            await fixture.close();
            result.browserDifference = 'Plain Tab skips anchors in this Windows WebKit engine, including a minimal fixture';
            await page.locator('.text-nav a').first().focus();
          } else assert.ok(result.inMenu, JSON.stringify(result));
          await page.keyboard.press('Escape');
          assert.ok(await menu.evaluate(element => element === document.activeElement));
          return result;
        });
      }
      await page.close(); await context.close();
    }
  } finally { await browser.close(); }
  await writeFile(new URL('stage-2-results.json', out), JSON.stringify(report, null, 2));
  console.log(`Completed ${name}`);
}
report.links = [...links].sort();
await writeFile(new URL('stage-2-results.json', out), JSON.stringify(report, null, 2));
const routeFailures = report.routes.filter(row => row.errors.length || row.failedLocal.length || row.badResponses.length || row.scrollWidth > row.viewport);
console.log(JSON.stringify({ browsers: report.browsers, visits: report.routes.length, routeFailures, checks: report.checks.length, failed: report.checks.filter(row => !row.pass) }, null, 2));
if (routeFailures.length || report.checks.some(row => !row.pass) || report.browsers.some(row => row.error)) process.exitCode = 1;
