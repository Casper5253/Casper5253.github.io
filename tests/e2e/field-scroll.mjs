import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const origin = process.env.TEST_ORIGIN || 'http://localhost:4331/';
const label = process.argv[2] || 'current';
assert.match(label, /^[a-z0-9-]+$/);
const directory = new URL(`../../.artifacts/field-scroll/${label}/`, import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const failures = [];
const timing = process.argv.includes('--timing');
function instrumentTiming() {
  const request = requestAnimationFrame.bind(window);
  const clear = CanvasRenderingContext2D.prototype.clearRect;
  let draws = 0;
  window.fieldTimings = [];
  CanvasRenderingContext2D.prototype.clearRect = function (...args) {
    if (this.canvas.classList.contains('depth-field')) draws++;
    return clear.apply(this, args);
  };
  window.requestAnimationFrame = callback => request(time => {
    const before = draws;
    const start = performance.now();
    callback(time);
    if (draws > before) window.fieldTimings.push({ time, work: performance.now() - start });
  });
}
try {
  for (const mobile of [false, true]) {
    if (timing) {
      for (let trial = 1; trial <= 5; trial++) {
        const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile, hasTouch: mobile });
        await context.route('**/*', route => new URL(route.request().url()).origin === new URL(origin).origin ? route.continue() : route.abort());
        await context.addInitScript(instrumentTiming);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(origin, { waitUntil: 'networkidle' });
        await page.waitForSelector('canvas.depth-field[data-first-frame-at]');
        await page.waitForTimeout(800);
        await page.evaluate(async () => {
          window.fieldTimings = [];
          const bottom = document.documentElement.scrollHeight - innerHeight;
          const start = performance.now();
          while (performance.now() - start < 2200) {
            await new Promise(requestAnimationFrame);
            scrollTo({ top: bottom * Math.min(1, (performance.now() - start) / 2000), behavior: 'instant' });
          }
        });
        const samples = await page.evaluate(() => window.fieldTimings);
        const times = [...new Set(samples.map(sample => sample.time))];
        const intervals = times.slice(1).map((time, i) => time - times[i]);
        const percentile = (values, p) => values.toSorted((a, b) => a - b)[Math.floor(values.length * p)];
        const row = { width: mobile ? 390 : 1440, trial, callbacks: samples.length, errors,
          intervalMedian: percentile(intervals, 0.5), intervalP95: percentile(intervals, 0.95),
          workMedian: percentile(samples.map(sample => sample.work), 0.5), workP95: percentile(samples.map(sample => sample.work), 0.95) };
        results.push(row);
        assert.ok(samples.length > 30 && errors.length === 0, 'Timing must include successful field draws');
        console.log(JSON.stringify(row));
        await context.close();
      }
      continue;
    }
    for (const reduced of [false, true]) {
      const context = await browser.newContext({
        viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 900 },
        deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile, hasTouch: mobile,
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      });
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(origin).origin ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas.depth-field[data-first-frame-at]');
      await page.waitForTimeout(600);
      await page.evaluate(() => {
        const probe = document.createElement('canvas');
        probe.width = 144; probe.height = 90;
        const ctx = probe.getContext('2d', { willReadFrequently: true });
        window.fieldSamples = [];
        window.fieldPhase = 'idle';
        let previous = 0;
        function hasSpace() {
          const selector = 'h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,figure,img,svg,video,a,button,label,input,textarea,select,pre,table,[data-field-exclude],[data-artifact-plane],.site-header';
          const masks = [...document.querySelectorAll(selector)].flatMap(element => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            if (style.display === 'none' || style.visibility === 'hidden' || element.closest('[hidden]') || !rect.width || !rect.height) return [];
            const pad = element.matches('[data-artifact-plane]') ? 22 : 30;
            return [{ left: rect.left - pad, right: rect.right + pad, top: rect.top - pad, bottom: rect.bottom + pad }];
          });
          // Text-filled phone viewports can legitimately leave no room for stars.
          for (let top = 0; top + 80 <= innerHeight; top += 16) {
            const intervals = masks.filter(rect => rect.bottom > top && rect.top < top + 80).sort((a, b) => a.left - b.left);
            let left = 0;
            for (const rect of intervals) {
              if (Math.min(innerWidth, rect.left) - left >= 160) return true;
              left = Math.max(left, rect.right);
            }
            if (innerWidth - left >= 160) return true;
          }
          return false;
        }
        function sample(now) {
          ctx.clearRect(0, 0, probe.width, probe.height);
          const layers = [...document.querySelectorAll('canvas.depth-field,canvas.depth-field-crossfade')];
          for (const layer of layers) {
            ctx.globalAlpha = Number(getComputedStyle(layer).opacity);
            ctx.drawImage(layer, 0, 0, probe.width, probe.height);
          }
          ctx.globalAlpha = 1;
          const pixels = ctx.getImageData(0, 0, probe.width, probe.height).data;
          let alpha = 0;
          for (let i = 3; i < pixels.length; i += 4) alpha += pixels[i];
          if (alpha === 0) for (const layer of layers) {
            if (Number(getComputedStyle(layer).opacity) === 0) continue;
            const full = layer.getContext('2d').getImageData(0, 0, layer.width, layer.height).data;
            for (let i = 3; i < full.length; i += 4) alpha += full[i];
          }
          window.fieldSamples.push({ time: now, interval: now - previous, y: scrollY, alpha,
            space: alpha > 0 || hasSpace(),
            phase: window.fieldPhase, chapter: document.documentElement.dataset.chapter });
          previous = now;
          window.fieldSampler = requestAnimationFrame(sample);
        }
        window.fieldSampler = requestAnimationFrame(sample);
      });
      const phase = name => page.evaluate(value => { window.fieldPhase = value; }, name);
      await phase('slow-wheel');
      for (let i = 0; i < 18; i++) { await page.mouse.wheel(0, 12); await page.waitForTimeout(20); }
      await phase('fast-wheel');
      for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 110); await page.waitForTimeout(12); }
      await phase('boundaries');
      await page.evaluate(async () => {
        scrollTo({ top: 0, behavior: 'instant' });
        const bottom = document.documentElement.scrollHeight - innerHeight;
        for (let y = 0; y <= bottom + 80; y += 80) {
          await new Promise(requestAnimationFrame);
          scrollTo({ top: y, behavior: 'instant' });
        }
      });
      let touchTravel = null;
      if (mobile) {
        await phase('touch-resize');
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForTimeout(100);
        const startY = await page.evaluate(() => scrollY);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 710 }] });
        for (let i = 1; i <= 18; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: 710 - i * 30 }] });
          if (i === 9) await page.setViewportSize({ width: 390, height: 760 });
          await page.waitForTimeout(16);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        touchTravel = await page.evaluate(() => scrollY) - startY;
        if (touchTravel < 100) failures.push('Touch input must actually scroll the page');
      }
      await phase('return');
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(800);
      await phase('settled');
      await page.waitForTimeout(900);
      const samples = await page.evaluate(() => { cancelAnimationFrame(window.fieldSampler); return window.fieldSamples; });
      const phases = [...new Set(samples.map(sample => sample.phase))].map(name => {
        const frames = samples.filter(sample => sample.phase === name);
        return { name, frames: frames.length, blank: frames.filter(sample => sample.alpha === 0 && sample.space).length,
          occluded: frames.filter(sample => !sample.space).length,
          minAlpha: Math.min(...frames.map(sample => sample.alpha)) };
      });
      const chapters = [...new Set(samples.filter(sample => sample.phase === 'boundaries').map(sample => sample.chapter))];
      const name = `${mobile ? '390' : '1440'}-${reduced ? 'reduced' : 'motion'}`;
      await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, directory)) });
      results.push({ name, phases, chapters, touchTravel, errors, samples });
      for (const item of phases) if (item.blank) failures.push(`${name} ${item.name}: ${item.blank}/${item.frames} blank frames`);
      if (['opening', 'understand', 'build', 'refine', 'deliver', 'learn'].some(chapter => !chapters.includes(chapter))) failures.push(`${name}: did not cross every chapter`);
      if (errors.length) failures.push(`${name}: ${errors.join('; ')}`);
      if (reduced) {
        const still = samples.filter(sample => sample.phase === 'settled').slice(-12).map(sample => sample.alpha);
        if (!still.length || new Set(still).size !== 1 || still[0] === 0) failures.push(`${name}: reduced-motion field must stay visible and static`);
      }
      console.log(JSON.stringify({ name, phases, chapters, errors }));
      await context.close();
    }
  }
  if (!timing) for (const mobile of [false, true]) {
    const viewport = { width: mobile ? 390 : 1440, height: mobile ? 844 : 900 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 3 : 1, isMobile: mobile, hasTouch: mobile });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(origin).origin ? route.continue() : route.abort());
    await context.addInitScript(() => {
      window.fieldDrawn = [];
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) { if (this.canvas.classList.contains('depth-field')) window.fieldDrawn = []; return clear.apply(this, args); };
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (this.canvas.classList.contains('depth-field')) window.fieldDrawn.push([args[3], args[1] + args[3] / 2, args[2] + args[4] / 2]);
        return draw.apply(this, args);
      };
    });
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas.depth-field[data-first-frame-at]');
    await page.waitForTimeout(800);
    const step = mobile ? 20 : 30;
    const steps = await page.evaluate(async step => {
      const bottom = document.documentElement.scrollHeight - innerHeight;
      const stops = [];
      for (let y = 0; y < bottom; y += step) stops.push(y);
      for (let y = bottom; y > 0; y -= step) stops.push(y);
      const samples = [];
      for (const y of stops) {
        scrollTo({ top: y, behavior: 'instant' });
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        samples.push({ time: performance.now(), y: scrollY, chapter: document.documentElement.dataset.chapter, drawn: window.fieldDrawn });
      }
      return samples;
    }, step);
    // Each star's sprite size is fixed by its depth, so it identifies the star across frames. A star visible in both samples
    // moves with the page plus at most the relocation spring's peak rate, omega/e (omega <= 21.5/s) of the full viewport
    // diagonal per unit of relocation clock, which runs on elapsed time plus scrolled distance / 3000px. Before the fix a
    // relocation moved the whole visible formation 600-800px in one step.
    const diagonal = Math.hypot(viewport.width, viewport.height);
    const byStar = drawn => {
      const stars = new Map();
      for (const [size, x, y] of drawn) stars.set(size, stars.has(size) ? null : { x, y });
      return stars;
    };
    const moves = steps.slice(1).flatMap((current, i) => {
      const previous = steps[i];
      if (!previous) return [];
      const before = byStar(previous.drawn);
      const offsets = [];
      for (const [size, at] of byStar(current.drawn)) {
        const was = before.get(size);
        if (at && was) offsets.push(Math.hypot(at.x - was.x, at.y - was.y + (current.y - previous.y)));
      }
      if (offsets.length < 10) return [];
      const elapsed = current.time - previous.time;
      const median = offsets.sort((a, b) => a - b)[Math.floor(offsets.length / 2)] ?? 0;
      return [{ from: previous.y, to: current.y, chapter: current.chapter, stars: offsets.length, median: Math.round(median),
        limit: Math.round(8 + 21.5 / Math.E * diagonal * (elapsed / 1000 + Math.abs(current.y - previous.y) / 3000)), elapsed: Math.round(elapsed) }];
    }).sort((a, b) => b.median / b.limit - a.median / a.limit);
    const name = `${viewport.width}-continuity`;
    const jumps = moves.filter(item => item.median > item.limit);
    results.push({ name, step, checked: moves.length, worst: moves.slice(0, 8) });
    if (moves.length < 100) failures.push(`${name}: only ${moves.length}/${steps.length} steps had enough stars visible on both sides`);
    if (jumps.length) failures.push(`${name}: ${jumps.length} scroll steps moved visible stars faster than relocation allows, worst ${JSON.stringify(jumps[0])}`);
    console.log(JSON.stringify({ name, step, steps: steps.length, checked: moves.length, jumps: jumps.length, worst: moves.slice(0, 4) }));
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(new URL('results.json', directory), JSON.stringify({ results, failures }, null, 2));
for (const failure of failures) console.error(`FAIL ${failure}`);
assert.equal(failures.length, 0, `Scroll field must remain visible. ${failures.length} failures.`);
console.log(timing ? 'PASS field-scroll timing: 5 trials per viewport, no pixel readback' : 'PASS field-scroll: wheel, chapter boundaries, touch resize, reduced motion, and slow-scroll continuity');
