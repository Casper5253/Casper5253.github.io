# Maintaining the site

Everything on the site comes from a small set of data files. You rarely touch page code.

## Add a project

1. Create `src/content/projects/<id>.md` — copy an existing one. The frontmatter fields (schema in `src/content.config.ts`):
   - `title` — the project's name.
   - `short` — one line for cards and lists (max 120 characters).
   - `kind` — `client`, `independent` or `creative`.
   - `status` — how far it got: `ongoing`, `in-progress`, `adopted`, `demonstrated`, `daily-use`, `finished` or `prototype`. A prototype never reads as a product.
   - `period` — when, in words.
   - `role` — your actual part in it, in plain words. Never more than the evidence supports.
   - `stack` — list of technologies.
   - `order` — position on /work/ and inside its one chapter; lower comes first.
   - `home` — the one chapter where the project appears, with what it shows there. One project, one appearance. Fields: `chapter` (one of `understand`, `build`, `refine`, `deliver`, `learn`), `note` (one line: the angle it shows there), and optionally `diagram` (an id from `Diagram.astro`'s list) and `stack` (a list of artifact ids from `src/data/artifacts.ts`, shown as its artifact stack). A project with a `diagram` or `stack` is shown as that chapter's showcase; one with neither appears as a card in "The work behind it". Omit `home` entirely to leave a project off the home page on purpose.
   - `repo` — public repository URL only. Private work carries no URL at all.
   - `article` — optional: `title`, `href` (/writing/<slug>/) and `standfirst` for the long-form article.
   - `links` — other public links (`label`, `url`).
   - `facts` — real, sourced numbers only: `label`, `value`, `source` (the file or record the value comes from).
   - `artifacts` — image ids from `src/data/artifacts.ts`, shown on the case study.
   - `noImage` — why there is no image, when there is none.
   - `caseStudy` — `false` for work mentioned in passing that has no case-study page yet.
   - `draft` — `true` hides it from the site entirely.
2. `npm run verify`.

## Update a status

Change `status` in the project's frontmatter. Labels: `ongoing`, `in-progress`, `adopted`, `demonstrated`, `daily-use`, `finished`, `prototype`.

## Attach screenshots

1. Put the images in `src/assets/<project>/`.
2. Register them in `src/data/artifacts.ts`: `title`, `label` (short card label), `caption`, `alt`, `project`, and `print` — `true` marks a light document (article page or figure) that is framed as a lit print; photographs and dark images are `false`.
3. Reference the ids in the project's `artifacts` frontmatter, or in the project's `home.stack`.
4. Privacy checklist for images: no client material, no real financial figures, no account numbers, no email addresses, no visible local file paths, no private repositories. The privacy gate (`npm run privacy`) also fails on any image file named `*finance*` or `*usage-overlay*` — never screenshot those projects; register a `noImage` reason instead.

## Articles

1. Write a standalone reading page: `public/writing/<slug>/index.html` (copy an existing article's structure).
2. Link it from the project's `article` frontmatter (`title`, `href: /writing/<slug>/`, `standfirst`).
3. Refresh the article images used by the case studies: open `scripts/capture-articles.mjs` and add an entry `{ id: '<slug>', figures: { 1: '<slug>-figure-1', ... } }` to the `ARTICLES` list, then run `node scripts/capture-articles.mjs`. It screenshots the article opening and chosen figures into `src/assets/<slug>/` at 2x; register those in `artifacts.ts` as above.

## Update experience, education, skills, portrait

Everything on /about/ comes from `src/data/profile.ts` (and the portrait in `src/assets/portrait/`). Nothing is ever invented elsewhere. Then refresh the CV PDF:

    npm run build && npm run cv && npm run build

## Chapters

The home page tells the story in five chapters (`src/data/stages.ts`): **understand** the problem, **build** the first working thing, **refine** it with real feedback, **deliver** it and help people use it, and **learn**, improve, repeat. The rule: one project, one appearance. Each project names exactly one `home` chapter in its frontmatter; it shows up there as a showcase (its `diagram`, then its `stack`) or as a card in "The work behind it", never in more than one chapter, and never twice. A project without a `home` block simply stays off the home page. A unit test (`tests/project-home-uniqueness.test.ts`) and the home e2e enforce this; the schema is strict, so the retired `stages` key now fails the build. To add a diagram or stack: set `home.diagram` to a `DiagramId` (defined in `src/components/home/Diagram.astro`) or `home.stack` to artifact ids from `src/data/artifacts.ts` — each diagram and artifact may serve only one project.

## Verify and publish

    npm run verify     # contrast, unit tests, astro check, build, privacy, link check

Then preview (`npm run preview`), get Casper's approval, and push to `main` — the deploy workflow builds and publishes automatically.
