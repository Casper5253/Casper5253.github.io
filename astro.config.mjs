import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Design-history folders kept in public/ for local review only; they must never ship.
const localOnlyFolders = ['explorations', 'phase-2', 'phase-2-5', 'phase-2-6'];
const stripLocalOnly = {
  name: 'strip-local-only',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const out = fileURLToPath(dir);
      for (const folder of localOnlyFolders) rmSync(`${out}${folder}`, { recursive: true, force: true });
    },
  },
};

const base = process.env.BASE ?? '/';

// Markdown content links to site pages as "/projects/hx". Prefix them with the base so they
// still work when the site is deployed under a sub-path.
const prefix = base.replace(/\/$/, '');
const baseLinks = {
  name: 'base-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties?.href;
      if (prefix && typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !href.startsWith(`${prefix}/`)) {
        ctx.setProperty(node, 'href', prefix + href);
      }
    },
  },
};

// SITE and BASE let the same build target a user page (casper5253.github.io, base "/")
// or a project page (casper5253.github.io/<repo>, base "/<repo>").
export default defineConfig({
  site: process.env.SITE ?? 'https://casper5253.github.io',
  base,
  markdown: { processor: satteri({ hastPlugins: [baseLinks] }) },
  trailingSlash: 'ignore',
  integrations: [sitemap(), stripLocalOnly],
});
