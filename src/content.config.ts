import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { DIAGRAM_IDS, STAGE_IDS } from './data/stages';
import { ARTIFACT_IDS } from './data/artifacts';

// How far a project got. The label is shown wherever the project is, so a prototype never reads as a product.
export const STATUSES = {
  ongoing: 'Ongoing',
  'in-progress': 'In progress',
  adopted: 'Adopted by its users',
  demonstrated: 'Demonstrated to clients',
  'daily-use': 'In daily use',
  finished: 'Finished',
  prototype: 'Prototype',
} as const;

const stageId = z.enum(STAGE_IDS);
const diagramId = z.enum(DIAGRAM_IDS);
const artifactId = z.enum(ARTIFACT_IDS);

// Strict: an unknown or retired key (for example the old `stages` list) fails the build,
// so a project can never quietly render in the wrong place. `home` stays optional so a
// project can be left off the home page on purpose.
export const projectSchema = z.object({
    title: z.string(),
    /** One line for cards and lists. */
    short: z.string().max(120),
    kind: z.enum(['client', 'independent', 'creative']),
    status: z.enum(Object.keys(STATUSES) as [keyof typeof STATUSES, ...(keyof typeof STATUSES)[]]),
    period: z.string(),
    /** My actual part in it, in plain words. Never more than the evidence supports. */
    role: z.string(),
    stack: z.array(z.string()).default([]),
    /** Position on the Work page and inside a chapter; lower comes first. */
    order: z.number().int(),
    /** The one chapter where this project appears, with an optional diagram or artifact stack. */
    home: z.object({
      chapter: stageId,
      note: z.string(),
      diagram: diagramId.optional(),
      stack: z.array(artifactId).optional(),
    }).optional(),
    /** Public repository only. Private work carries no URL at all. */
    repo: z.url({ protocol: /^https$/ }).optional(),
    /** A long-form article under /writing/. */
    article: z.object({ title: z.string(), href: z.string(), standfirst: z.string() }).optional(),
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    /** Real, sourced numbers only; `source` names the file or record the value comes from. */
    facts: z.array(z.object({ label: z.string(), value: z.string(), source: z.string() })).default([]),
    /** Images shown on the case study, in order. */
    artifacts: z.array(artifactId).default([]),
    /** Why there is no image, when there is none. */
    noImage: z.string().optional(),
    /** False for work mentioned in passing that has no case-study page yet. */
    caseStudy: z.boolean().default(true),
    /** Hidden from the site while true. */
    draft: z.boolean().default(false),
  }).strict();

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: projectSchema,
});

export const collections = { projects };
