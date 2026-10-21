# Casper van Tongeren — portfolio

Static Astro site for casper5253.github.io: a story in five chapters, a work index with case studies, and an About & CV page whose print view generates the CV PDF.

- How to add projects, articles, images or CV updates: [docs/MAINTAINING.md](docs/MAINTAINING.md)

## Run it

Node 22.

    npm ci
    npm run dev          # http://localhost:4321
    npm run verify       # contrast check, unit tests, astro check, build, privacy scan, link check

## Where things live

| Path | Owns |
|---|---|
| `src/content/projects/*.md` | One file per project; the schema in `src/content.config.ts` requires a status and a source for every number. |
| `src/data/profile.ts` | Everything on /about/ and the CV PDF. |
| `src/data/stages.ts` | The five chapters of the home page. |
| `src/data/artifacts.ts` | Every image the site shows from real work, with captions and alt text. |
| `src/pages/` | Home (story), /work/, case studies, /about/, /cv/ redirect. |
| `public/writing/` | Standalone article pages. |
| `scripts/` | `contrast.mjs`, `smoke.mjs`, `check-links.mjs`, `privacy.mjs`, `og.mjs` (social image), `cv-pdf.mjs` (CV PDF), `capture-articles.mjs`. |

## Deploy

Push to `main` — the workflow verifies, builds with the resolved SITE/BASE, generates the CV PDF, scans `dist/` with the privacy gate, and publishes to GitHub Pages. Publishing needs Casper's approval.
