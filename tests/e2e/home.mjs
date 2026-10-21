import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const origin = 'http://localhost:4329/';
const shots = join(process.cwd(), '.artifacts/home-screens');
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
  page.on('pageerror', (error) => consoleErrors.push(error.message));

let failures = 0;
async function check(name, run) {
  try {
    await run();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stdout.write(`FAIL ${name}: ${error.message}\n`);
  }
}

async function scrollToAndWaitForEnd(id) {
  await page.evaluate((chapterId) => new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('scrollend', finish);
      resolve();
    };
    const timeout = window.setTimeout(finish, 2500);
    window.addEventListener('scrollend', finish, { once: true });
    document.getElementById(chapterId).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }), id);
  await page.waitForTimeout(100);
}

try {
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'astro-dev-toolbar, astro-dev-toolbar-root { display: none !important; }' });

  await check('every project appears in at most one chapter', async () => {
    const appearances = await page.locator('.artifact-group, .concept-diagram, .project-card').evaluateAll((elements) => elements.map((element) => ({
      project: element.getAttribute('data-project'),
      chapter: element.closest('[data-chapter]')?.getAttribute('data-chapter'),
    })));
    const chaptersByProject = new Map();
    for (const appearance of appearances) {
      assert.ok(appearance.project && appearance.chapter, 'project appearance must identify its project and chapter');
      const chapters = chaptersByProject.get(appearance.project) ?? new Set();
      chapters.add(appearance.chapter);
      chaptersByProject.set(appearance.project, chapters);
    }
    assert.deepEqual([...chaptersByProject.keys()].sort(), ['agentmem', 'crisis-sim', 'dq-tool', 'film', 'finance', 'hx', 'knowledge-graph', 'newsletter', 'quantlab']);
    for (const [project, chapters] of chaptersByProject) {
      assert.ok(chapters.size <= 1, `${project} appears in ${[...chapters].join(', ')}`);
    }
  });

  await check('all overview links activate and scroll to their chapter', async () => {
    const overviewLinks = page.locator('.overview a');
    assert.equal(await overviewLinks.count(), 5);
    for (let index = 0; index < 5; index += 1) {
      const link = overviewLinks.nth(index);
      const target = await link.getAttribute('href');
      const chapterId = target?.split('#')[1];
      assert.ok(chapterId);
      await link.click();
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      await page.waitForFunction(({ id, height }) => {
        return document.documentElement.dataset.chapter === id && document.getElementById(id).getBoundingClientRect().top < height * .5;
      }, { id: chapterId, height: viewportHeight });
      const chapterTop = await page.locator(`#${chapterId}`).evaluate((element) => element.getBoundingClientRect().top);
      assert.ok(chapterTop < viewportHeight * .5, `${chapterId} did not scroll into view`);
    }
  });

  await check('one chapter nav item and title match after each scroll ends', async () => {
    for (const id of ['understand', 'build', 'refine', 'deliver', 'learn']) {
      await scrollToAndWaitForEnd(id);
      await page.waitForFunction((chapterId) => document.documentElement.dataset.chapter === chapterId, id);
      const current = page.locator('[aria-current]');
      assert.equal(await current.count(), 1, `${id} should have exactly one aria-current item`);
      assert.equal(await current.getAttribute('href'), `/#${id}`);
      assert.equal(await page.locator('.active-title').textContent(), await page.locator(`#${id} h2`).textContent());
    }
  });

  await check('each chapter field zone is visible and at least 280px wide at 1440px', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const id of ['understand', 'build', 'refine', 'deliver', 'learn']) {
      const zone = page.locator(`#${id} [data-field-zone]`);
      assert.equal(await zone.count(), 1, `${id} should have one field zone`);
      const dimensions = await zone.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { width: rect.width, height: rect.height, display: style.display, visibility: style.visibility, visible: element.checkVisibility() };
      });
      assert.ok(dimensions.width >= 280, `${id} field zone is only ${dimensions.width}px wide`);
      assert.ok(dimensions.height > 0, `${id} field zone has no height`);
      assert.notEqual(dimensions.display, 'none', `${id} field zone is display:none`);
      assert.notEqual(dimensions.visibility, 'hidden', `${id} field zone is hidden`);
      assert.equal(dimensions.visible, true, `${id} field zone is not visible`);
      assert.equal(await zone.getAttribute('aria-hidden'), 'true');
      assert.equal(await zone.getAttribute('data-artifact-plane'), null);
    }

    for (const id of ['deliver', 'learn']) {
      const groups = await page.locator(`#${id} .artifact-stacks .artifact-group`).evaluateAll((elements) => elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, top: rect.top };
      }));
      assert.equal(groups.length, 1, `${id} should have one stack group`);
      assert.ok(groups[0].width >= 360, `${id} stack group should be at least 360px wide`);
    }
  });

  await check('QuantLab steps fit at desktop, tablet and mobile widths', async () => {
    for (const [width, height] of [[1440, 900], [1024, 900], [390, 844]]) {
      await page.setViewportSize({ width, height });
      const dimensions = await page.locator('#build .diagram-steps').evaluate((list) => ({
        width: list.clientWidth,
        scrollWidth: list.scrollWidth,
        stepCount: list.children.length,
        tops: [...list.children].map((step) => step.getBoundingClientRect().top),
      }));
      assert.equal(dimensions.stepCount, 5, `${width}px should show all five steps`);
      assert.ok(dimensions.scrollWidth <= dimensions.width, `${width}px diagram overflows horizontally`);
      if (width === 1024 || width === 390) {
        assert.ok(dimensions.tops.every((top, index, tops) => index === 0 || top > tops[index - 1]), `${width}px steps should wrap vertically`);
      }
    }
  });

  await check('tablet stacks stay capped and hide field zones', async () => {
    await page.setViewportSize({ width: 900, height: 900 });
    const tablet = await page.locator('#refine').evaluate((chapter) => ({
      stackWidth: chapter.querySelector('.artifact-stacks').getBoundingClientRect().width,
      zoneDisplay: getComputedStyle(chapter.querySelector('.field-zone')).display,
    }));
    assert.ok(tablet.stackWidth <= 640, `tablet stack is ${tablet.stackWidth}px wide`);
    assert.equal(tablet.zoneDisplay, 'none');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('#refine .field-zone').evaluate((zone) => getComputedStyle(zone).display), 'none');
  });

  const deliver = page.locator('#deliver');
  await deliver.scrollIntoViewIfNeeded();
  const hxGroup = page.locator('#deliver .artifact-group').filter({ has: page.getByRole('heading', { name: 'hx and the Herdr team' }) });
  const cards = hxGroup.locator('[data-stack-card]');
  const indexButtons = hxGroup.locator('[data-stack-index]');
  assert.equal(await cards.count(), 5, 'expected the five assigned hx artifacts');

  await check('card clicks select items 3, 1, then 5', async () => {
    for (const index of [2, 0, 4]) {
      await cards.nth(index).click();
      assert.equal(await indexButtons.nth(index).getAttribute('aria-pressed'), 'true');
    }
  });

  await check('index buttons select items 3, 1, then 5', async () => {
    for (const index of [2, 0, 4]) {
      await indexButtons.nth(index).click();
      assert.equal(await indexButtons.nth(index).getAttribute('aria-pressed'), 'true');
    }
  });

  await check('ArrowLeft and ArrowRight move and select within the stack index', async () => {
    await indexButtons.nth(2).focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await indexButtons.nth(1).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-index')), '1');
    await page.keyboard.press('ArrowRight');
    assert.equal(await indexButtons.nth(2).getAttribute('aria-pressed'), 'true');
    await indexButtons.nth(0).focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await indexButtons.nth(4).getAttribute('aria-pressed'), 'true');
  });

  await check('Enter opens the current card and Escape restores focus', async () => {
    const currentCard = hxGroup.locator('[data-stack-card].is-current');
    await currentCard.focus();
    await page.keyboard.press('Enter');
    const dialog = hxGroup.locator('dialog');
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await dialog.evaluate((element) => element.matches(':modal')), true);
    const dialogImage = hxGroup.locator('[data-dialog-image]');
    await dialogImage.evaluate((image) => image.decode());
    assert.ok(await dialogImage.evaluate((image) => image.naturalWidth > 0));
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await currentCard.evaluate((element) => element === document.activeElement), true);
  });

  await check('opening portrait screenshot at 1440x900', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      history.replaceState(null, '', '/');
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForFunction(() => document.documentElement.dataset.chapter === 'opening');
    assert.equal(await page.locator('.active-title').textContent(), '');
    assert.equal(await page.locator('[aria-current]').count(), 0);
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(shots, 'opening-a-1440x900.png') });
  });

  await check('mobile menu opens and Escape restores focus', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.mouse.move(0, 0);
    const menuButton = page.locator('.menu-toggle');
    await menuButton.click();
    assert.equal(await menuButton.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await menuButton.getAttribute('aria-expanded'), 'false');
    assert.equal(await menuButton.evaluate((element) => element === document.activeElement), true);
  });

  await check('opening screenshot at 390x844', async () => {
    await page.evaluate(() => { history.replaceState(null, '', '/'); window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.waitForFunction(() => document.documentElement.dataset.chapter === 'opening');
    const openingLayout = await page.evaluate(() => {
      const portrait = document.querySelector('.portrait-a').getBoundingClientRect();
      const name = document.querySelector('#opening-heading').getBoundingClientRect();
      const intro = document.querySelector('.intro');
      const introBounds = intro.getBoundingClientRect();
      return {
        portraitRight: portrait.right,
        nameLeft: name.left,
        portraitBottom: portrait.bottom,
        introTop: introBounds.top,
        introFontSize: getComputedStyle(intro).fontSize,
        introLineHeight: getComputedStyle(intro).lineHeight,
      };
    });
    assert.ok(openingLayout.portraitRight <= openingLayout.nameLeft, 'portrait should sit beside the name');
    assert.ok(openingLayout.introTop >= openingLayout.portraitBottom, 'intro should sit below the portrait/name row');
    assert.equal(openingLayout.introFontSize, '15px');
    assert.equal(openingLayout.introLineHeight, '23.25px');
    await page.waitForTimeout(150);
    await page.screenshot({ path: join(shots, 'opening-a-390x844.png') });
  });

  await check('each chapter screenshot at 1440x900', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const id of ['understand', 'build', 'refine', 'deliver', 'learn']) {
      await page.evaluate((chapterId) => {
        const section = document.getElementById(chapterId);
        const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
        window.scrollTo({ top: section.offsetTop - headerHeight, behavior: 'instant' });
      }, id);
      await page.waitForTimeout(2500);
      await page.waitForFunction((chapterId) => document.documentElement.dataset.chapter === chapterId, id);
      const zonePoint = await page.locator(`#${id} [data-field-zone]`).evaluate((element, index) => {
        const rect = element.getBoundingClientRect();
        return {
          x: Math.max(8, Math.min(window.innerWidth - 8, (rect.left + rect.right) / 2 + index * 2)),
          y: Math.max(80, Math.min(window.innerHeight - 8, (rect.top + rect.bottom) / 2 + index * 2)),
        };
      }, ['understand', 'build', 'refine', 'deliver', 'learn'].indexOf(id));
      await page.mouse.move(zonePoint.x, zonePoint.y);
      await page.screenshot({ path: join(shots, `chapter-${id}-1440x900.png`) });
    }
  });

  await check('each chapter screenshot at 390x844', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of ['understand', 'build', 'refine', 'deliver', 'learn']) {
      await page.evaluate((chapterId) => {
        const section = document.getElementById(chapterId);
        const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
        window.scrollTo({ top: section.offsetTop - headerHeight, behavior: 'instant' });
      }, id);
      await page.waitForFunction((chapterId) => document.documentElement.dataset.chapter === chapterId, id);
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(shots, `chapter-${id}-390x844.png`) });
    }
  });

  await check('no horizontal overflow at 390, 1280, 1440, and 1920px', async () => {
    for (const [width, height] of [[390, 844], [1280, 800], [1440, 900], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(100);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      assert.ok(dimensions.document <= dimensions.viewport, `${width}px viewport overflows to ${dimensions.document}px`);
    }
  });

  await check('no console errors', async () => {
    assert.deepEqual(consoleErrors, []);
  });
} finally {
  await browser.close();
}

if (failures) process.exitCode = 1;
