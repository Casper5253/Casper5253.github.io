// Crawls every HTML file in dist/ and fails on any internal link or asset that does not resolve,
// with or without a base path (PR builds use BASE=/subpath-check). Static articles under
// public/writing/ use relative links and must still resolve. External links are listed, never fetched.
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';

const root = resolve('dist');
const base = process.argv[2];
if (!base || !base.startsWith('/') || (base !== '/' && base.endsWith('/'))) throw new Error('Pass a BASE path such as / or /subpath-check');

const htmlFiles = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith('.html')) htmlFiles.push(path);
  }
}
await collect(root);

const allFiles = new Set();
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else allFiles.add(path.slice(root.length + 1).replaceAll('\\', '/'));
  }
}
await walk(root);

const exists = (relPath) => {
  const clean = relPath.split('?')[0].replace(/\/+$/, '');
  if (!clean) return allFiles.has('index.html');
  return allFiles.has(clean) || allFiles.has(`${clean}/index.html`) || allFiles.has(`${clean}.html`) || allFiles.has(`${clean}/index.html`).valueOf() === true;
};
const hasFragment = async (relPath, fragment) => {
  const clean = relPath.split('?')[0].replace(/\/+$/, '');
  const file = ['index.html', `${clean}/index.html`, `${clean}.html`].map((c) => join(root, c)).find((p) => allFiles.has(p.slice(root.length + 1).replaceAll('\\', '/')));
  if (!file) return false;
  const html = await readFile(file, 'utf8');
  return new RegExp(`(?:id|name)=["']${fragment.replaceAll('"', '\\"')}["']`).test(html);
};

const external = new Set();
const failures = [];

for (const file of htmlFiles) {
  const rel = file.slice(root.length + 1).replaceAll('\\', '/');
  const html = await readFile(file, 'utf8');
  const targets = [];
  for (const match of html.matchAll(/(?:href|src)=["']([^"']*)["']/g)) targets.push(match[1]);
  for (const match of html.matchAll(/srcset=["']([^"']*)["']/g)) {
    for (const part of match[1].split(',')) {
      const candidate = part.trim().split(/\s+/)[0];
      if (candidate) targets.push(candidate);
    }
  }

  for (const raw of targets) {
    if (!raw || raw.startsWith('data:')) continue;
    if (raw.startsWith('#')) {
      const fragment = raw.slice(1);
      if (fragment && !new RegExp(`(?:id|name)=["']${fragment.replaceAll('"', '\\"')}["']`).test(html)) failures.push(`${rel}: missing fragment ${raw}`);
      continue;
    }
    if (/^(https?:|mailto:|tel:)/i.test(raw) || raw.startsWith('//')) {
      external.add(raw.startsWith('//') ? `https:${raw}` : raw);
      continue;
    }

    let target = raw;
    let fragment = '';
    const hashAt = target.indexOf('#');
    if (hashAt >= 0) {
      fragment = target.slice(hashAt + 1);
      target = target.slice(0, hashAt);
    }

    let relPath;
    if (target.startsWith('/')) {
      if (base !== '/') {
        if (target !== base && !target.startsWith(`${base}/`)) {
          failures.push(`${rel}: root-relative link bypasses BASE ${base}: ${raw}`);
          continue;
        }
        target = target === base ? '/' : target.slice(base.length);
      }
      relPath = target.slice(1);
    } else {
      relPath = join(dirname(file), target).slice(root.length + 1).replaceAll('\\', '/');
    }

    if (!exists(relPath)) {
      failures.push(`${rel}: unresolved ${raw}`);
      continue;
    }
    if (fragment && !(await hasFragment(relPath, fragment))) failures.push(`${rel}: missing fragment ${raw}`);
  }
}

console.log(`External links (${external.size}):`);
for (const link of [...external].sort()) console.log(`  ${link}`);

if (failures.length) throw new Error(`Broken internal links or assets:\n${failures.join('\n')}`);
console.log(`Checked ${htmlFiles.length} HTML files for BASE ${base}: all internal links and assets resolve.`);
