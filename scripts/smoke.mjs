import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const astro = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const artifacts = new URL('../.artifacts/smoke/', import.meta.url);
const viewports = [{ width: 1280, height: 800 }, { width: 360, height: 740 }];
const privateRepo = /github\.com\/Casper5253\/(?:quantlab|personal-finance-cockpit|algo-trading)(?=[/?#]|$)/i;
const base = `/${(process.env.BASE ?? '/').replace(/^\/+|\/+$/g, '')}`.replace(/\/?$/, '/');
const failures = [];

function start(args, stdio = 'inherit') {
  return spawn(process.execPath, [astro, ...args], { cwd: root, stdio, windowsHide: true });
}

async function build() {
  const child = start(['build']);
  const [code] = await once(child, 'exit');
  if (code !== 0) throw new Error(`astro build exited ${code}`);
}

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function htmlPages(directory, prefix = '') {
  const pages = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) pages.push(...await htmlPages(new URL(`${entry.name}/`, directory), `${path}/`));
    else if (entry.name.endsWith('.html') && path !== '404.html') {
      pages.push(base + path.replace(/(?:^|\/)index\.html$/, match => match.startsWith('/') ? '/' : '').replace(/\.html$/, ''));
    }
  }
  return pages;
}

function trainPositions() {
  return [];
}

async function inspect(page, url, viewport, checkLink, enqueue, { status = 200, heading } = {}) {
  console.log(`Checking ${new URL(url).pathname} ${viewport.width}x${viewport.height}`);
  const issues = [];
  page.on('console', message => {
    const expected404 = status === 404 && message.location().url === url &&
      /^Failed to load resource: the server responded with a status of 404\b/.test(message.text());
    if (message.type() === 'error' && !expected404) issues.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => issues.push(`exception: ${error.message}`));
  page.on('requestfailed', request => issues.push(`request failed: ${request.url()} ${request.failure()?.errorText}`));
  page.on('response', response => {
    const expected404 = status === 404 && response.status() === 404 && response.url() === url &&
      response.request().isNavigationRequest() && response.frame() === page.mainFrame();
    if (response.status() >= 400 && !expected404) issues.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    if (!response || response.status() !== status) issues.push(`navigation HTTP ${response?.status() ?? 'none'}, expected ${status}`);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      dimensions: `${document.documentElement.scrollWidth}/${innerWidth}`,
      h1: document.querySelectorAll('h1').length,
      heading: document.querySelector('h1')?.textContent.trim(),
      description: document.querySelector('meta[name="description"]')?.content.trim(),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim(),
      lang: document.documentElement.lang.trim(),
      missingAlt: document.querySelectorAll('img:not([alt])').length,
      ids: [...document.querySelectorAll('[id], a[name]')].flatMap(element => [element.id, element.getAttribute('name')]).filter(Boolean),
      links: [...document.querySelectorAll('a[href], area[href]')].map(link => new URL(link.getAttribute('href'), document.baseURI).href),
    }));
    if (result.overflow) issues.push(`horizontal overflow ${result.dimensions}`);
    if (result.h1 !== 1) issues.push(`expected one h1, found ${result.h1}`);
    if (heading && result.heading !== heading) issues.push(`expected heading: ${heading}`);
    if (!result.description) issues.push('meta description missing or empty');
    if (!result.canonical) issues.push('canonical link missing or empty');
    if (!result.lang) issues.push('html lang missing');
    if (result.missingAlt) issues.push(`${result.missingAlt} images without alt`);
    for (const href of new Set(result.links)) {
      if (privateRepo.test(href)) issues.push(`private repository link: ${href}`);
      const target = new URL(href);
      if (!['http:', 'https:'].includes(target.protocol) || target.origin !== new URL(url).origin) continue;
      const address = new URL(target);
      address.hash = '';
      const currentDocument = address.href === url;
      const linked = status === 404 && currentDocument ? { html: true, ids: result.ids } : await checkLink(target);
      if (linked.error) issues.push(linked.error);
      if (linked.html && !linked.error && !currentDocument) enqueue(target);
      if (target.hash && linked.html && !linked.error) {
        let id;
        try { id = decodeURIComponent(target.hash.slice(1)); } catch { id = target.hash.slice(1); }
        if (id && !linked.ids.includes(id) && id !== 'top' && !id.startsWith(':~:text=')) issues.push(`missing fragment: ${target.href}`);
      }
    }
    const name = new URL(url).pathname.replace(/\/$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'home';
    await page.screenshot({ path: fileURLToPath(new URL(`${name}-${viewport.width}.png`, artifacts)), fullPage: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const animations = await page.evaluate(() => document.getAnimations().filter(animation =>
      animation.playState === 'running' && animation.effect?.getComputedTiming().endTime > 50,
    ).map(animation => ({ name: animation.animationName ?? animation.id, endTime: String(animation.effect.getComputedTiming().endTime) })));
    if (animations.length) issues.push(`reduced-motion animations >50ms: ${JSON.stringify(animations)}`);
    if (new URL(url).pathname === base) {
      const stage = page.locator('[data-stage]');
      if (await stage.isVisible()) await stage.scrollIntoViewIfNeeded();
      const before = await page.evaluate(trainPositions);
      await page.waitForTimeout(1000);
      const after = await page.evaluate(trainPositions);
      if (JSON.stringify(before) !== JSON.stringify(after)) issues.push('positions changed under reduced motion over 1s');
    }
  } catch (error) {
    issues.push(error.message);
  }
  const unique = [...new Set(issues)];
  console.log(`${unique.length ? 'FAIL' : 'PASS'} ${new URL(url).pathname} ${viewport.width}x${viewport.height}${unique.length ? ` | ${unique.join(' | ')}` : ''}`);
  failures.push(...unique.map(issue => `${url} @${viewport.width}: ${issue}`));
}

let preview;
let browser;
let cleanupPromise;
function cleanup() {
  return cleanupPromise ??= (async () => {
    try { await browser?.close(); } finally {
      if (preview?.pid && preview.exitCode === null && preview.signalCode === null) {
        const exited = once(preview, 'exit');
        preview.kill();
        await exited;
      }
    }
  })();
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { void cleanup().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143)); });
}
try {
  await build();
  await mkdir(artifacts, { recursive: true });
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  let logs = '';
  preview = start(['preview', '--ignore-lock', '--host', '127.0.0.1', '--port', String(port)], ['ignore', 'pipe', 'pipe']);
  preview.stdout.on('data', chunk => { logs = (logs + chunk).slice(-8000); });
  preview.stderr.on('data', chunk => { logs = (logs + chunk).slice(-8000); });
  let spawnError;
  preview.on('error', error => { spawnError = error; });
  let ready = false;
  let readinessError;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (spawnError) throw spawnError;
    if (preview.exitCode !== null || preview.signalCode !== null) throw new Error(`preview exited ${preview.exitCode ?? preview.signalCode}: ${logs}`);
    try {
      const response = await fetch(`${origin}${base}`, { signal: AbortSignal.timeout(500) });
      ready = response.ok;
      readinessError = `HTTP ${response.status}`;
      if (ready) break;
    } catch (error) { readinessError = error.message; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error(`preview did not become ready at ${origin}${base}: ${readinessError}: ${logs}`);
  console.log(`Preview ${preview.pid} ready at ${origin}`);
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const request = await browser.newContext();
  const responses = new Map();
  async function checkLink(target) {
    const address = new URL(target);
    address.hash = '';
    if (!responses.has(address.href)) responses.set(address.href, (async () => {
      try {
        const response = await request.request.get(address.href);
        const html = response.headers()['content-type']?.includes('text/html') ?? false;
        if (!response.ok()) return { error: `link HTTP ${response.status()}: ${address.href}`, html };
        const ids = html ? await parser.evaluate(text => {
          const document = new DOMParser().parseFromString(text, 'text/html');
          return [...document.querySelectorAll('[id], a[name]')].flatMap(element => [element.id, element.getAttribute('name')]).filter(Boolean);
        }, await response.text()) : [];
        return { html, ids };
      } catch (error) { return { error: `link failed: ${address.href}: ${error.message}`, html: false }; }
    })());
    return responses.get(address.href);
  }
  const parser = await request.newPage();
  const queue = [];
  const seen = new Set();
  function enqueue(target) {
    const url = new URL(target, origin);
    url.hash = '';
    url.search = '';
    const key = url.href.replace(/\/$/, '');
    if (!seen.has(key)) { seen.add(key); queue.push(url.href); }
  }
  enqueue(base);
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    for (let index = 0; index < queue.length; index++) {
      const page = await context.newPage();
      await inspect(page, queue[index], viewport, checkLink, enqueue);
      await page.close();
      if (index === queue.length - 1) for (const path of await htmlPages(new URL('../dist/', import.meta.url))) enqueue(path);
    }
    for (const route of [{ path: '404', status: 200 }, { path: '__smoke_unknown_page__', status: 404 }]) {
      const page = await context.newPage();
      await inspect(page, `${origin}${base}${route.path}`, viewport, checkLink, enqueue,
        { status: route.status, heading: 'Nothing here' });
      await page.close();
    }
    await context.close();
  }
  console.log(`${failures.length ? 'FAIL' : 'PASS'} smoke: ${queue.length} pages + 2 not-found routes, ${viewports.length} viewports, ${failures.length} failures`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error(`FAIL smoke: ${error.stack ?? error}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
