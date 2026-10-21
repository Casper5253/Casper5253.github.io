// Generates public/cv/casper-van-tongeren-cv.pdf from the print view of /about/.
// Usage: 1) npx astro build   2) npm run cv   3) npx astro build again (so the PDF is copied into dist/).
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const out = fileURLToPath(new URL('../public/cv/casper-van-tongeren-cv.pdf', import.meta.url));
const about = await readFile(join(dist, 'about/index.html'), 'utf8');
const canonical = about.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
if (!canonical) throw new Error('Built About page must have a canonical URL');
const publicAbout = new URL(canonical[1]);
const base = publicAbout.pathname.replace(/\/about\/?$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

function serve(root, port) {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/+$/, '') || '/';
      if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length) || '/';
      let file = join(root, path);
      try {
        if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      } catch {
        file = join(root, path, 'index.html');
      }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolveServer) => server.listen(port, '127.0.0.1', () => resolveServer(server)));
}

const server = await serve(dist.replace(/[\\/]+$/, ''), 0);
const port = server.address().port;

let browser;
try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined) });
  const page = await browser.newPage();
  const failed = [];
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => failed.push(`${request.failure()?.errorText} ${request.url()}`));
  await page.goto(`http://127.0.0.1:${port}${base}/about/`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  if (failed.length) throw new Error(`CV assets failed to load:\n${failed.join('\n')}`);
  await page.evaluate(publicOrigin => {
    for (const link of document.querySelectorAll('a[href]')) {
      const url = new URL(link.href);
      if (url.origin === location.origin) {
        link.href = new URL(url.pathname + url.search + url.hash, publicOrigin).href;
        link.setAttribute('data-cv-local-link', '');
      }
    }
  }, publicAbout.origin);
  // Keep relative-link print styling after replacing the PDF link destinations.
  await page.addStyleTag({ content: '@media print { a[data-cv-local-link]::after { content: none !important; } }' });
  await mkdir(join(dist, '../public/cv/'), { recursive: true });
  const pdf = await page.pdf({ format: 'A4', printBackground: false });
  await writeFile(out, pdf);
  const pages = [...pdf.toString('latin1').matchAll(/\/Type\s*\/Page(?![s])/g)].length;
  console.log(`CV PDF written: ${pages} page(s)`);
} finally {
  await browser?.close();
  server.close();
}
