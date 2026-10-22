import type { ImageMetadata } from 'astro';
import hxArticle from '../assets/hx/hx-article-top.png';
import hxTeam from '../assets/hx/hx-figure-1.png';
import hxRouter from '../assets/hx/hx-figure-3.png';
import hxCost from '../assets/hx/hx-figure-4.png';
import hxCompaction from '../assets/hx/hx-figure-6.png';
import qlArticle from '../assets/quantlab/quantlab-article-top.png';
import qlTimeline from '../assets/quantlab/quantlab-figure-1.png';
import qlHurdles from '../assets/quantlab/quantlab-figure-2.png';
import filmBay from '../assets/film/bay-at-dusk.jpg';
import filmAboveBelow from '../assets/film/above-below.jpg';
import filmTitleReveal from '../assets/film/title-reveal.jpg';
import filmReef from '../assets/film/reef.jpg';
import filmEnergy from '../assets/film/music-energy-map.png';
import memoryGraph from '../assets/agentmem/memory-graph.png';

/**
 * Every image the site shows from real work. `print` marks a light document (article page or figure)
 * that is dimmed slightly and framed as a lit print on the dark page; photographs and dark images are not.
 * `focus` is the object-position used when the image is cropped into a stack card.
 */
export interface Artifact {
  image: ImageMetadata;
  title: string;
  /** Short label on the card: what you are looking at, in a few words. */
  label: string;
  caption: string;
  alt: string;
  project: string;
  print: boolean;
  /** True when the image is dark, so the dialog shows it on a dark backdrop instead of the cream one. */
  dark?: boolean;
  focus?: string;
}

export const ARTIFACTS = {
  'hx-article': {
    image: hxArticle, project: 'hx', print: true, focus: 'top',
    title: 'The hx field report', label: 'Article opening',
    caption: 'The opening of "Herding three coding agents on one budget": a terminal with three agents in their panes, and the question of who does which job.',
    alt: 'The opening of the hx article: a headline above a dark terminal window split into three agent panes.',
  },
  'hx-team': {
    image: hxTeam, project: 'hx', print: true,
    title: 'One feature, three agents', label: 'Lead, worker, reviewer',
    caption: 'The lead plans and checks the budget, a cheap model writes the code, and a model from a different vendor reviews it. Every message is a single line typed from one pane into another.',
    alt: 'Figure: three columns of short messages passed between a lead agent, an implementer and a reviewer.',
  },
  'hx-router': {
    image: hxRouter, project: 'hx', print: true,
    title: 'The router in miniature', label: 'How a task gets a model',
    caption: 'Stages run in order and the first one that decides wins. The real version also weighs each pool\'s headroom, which files each agent owns, and whether a warm session already has the right model loaded.',
    alt: 'Figure: a row of decision stages from attempt count to model ladder, ending in a routing decision.',
  },
  'hx-cost': {
    image: hxCost, project: 'hx', print: true,
    title: 'Same five tasks, very different bills', label: 'Seven models, measured',
    caption: 'Bar length is the cost of running all five benchmark tasks once; the label after it is how many passed. The most expensive model was not the most reliable.',
    alt: 'Bar chart of seven coding models: cost for five tasks and how many tasks each passed.',
  },
  'hx-compaction': {
    image: hxCompaction, project: 'hx', print: true,
    title: 'A real compaction', label: '310K to 31.6K tokens',
    caption: 'The implementer had grown to about 310K tokens. Afterwards it held 31.6K in the same session, and it built the next feature by reusing a function it had written before the summary.',
    alt: 'Figure: a context-size bar dropping from about 310K tokens to 31.6K tokens after compaction.',
  },
  'ql-article': {
    image: qlArticle, project: 'quantlab', print: true, focus: 'top',
    title: 'The QuantLab field report', label: 'Article opening',
    caption: 'The opening of "What Would an Agentic AI Quant Researcher Do?": six and a half hours from a one-page brief to a working research lab.',
    alt: 'The opening of the QuantLab article: headline, standfirst and four headline numbers.',
  },
  'ql-timeline': {
    image: qlTimeline, project: 'quantlab', print: true,
    title: 'One day, by deliverable', label: 'Who built what, and when',
    caption: 'Each bar spans the commits that built one deliverable, coloured by the agent that built it, from 11:30 to 18:30.',
    alt: 'Timeline chart from 11:30 to 18:30 with one bar per deliverable, coloured by the agent that built it.',
  },
  'ql-hurdles': {
    image: qlHurdles, project: 'quantlab', print: true, focus: 'top',
    title: 'Three hurdles, thirteen strategies', label: 'None clears all three',
    caption: 'Each row is one famous strategy with its three pass criteria, written down before any data was touched. At the registered setting none clears all of them.',
    alt: 'Table of thirteen strategies, each with a pass or fail mark for three hurdles; none passes all three.',
  },
  'film-bay': {
    image: filmBay, project: 'film', print: false, dark: true,
    title: 'Labuan Bajo at dusk', label: 'The bay at dusk',
    caption: 'A still from the 14-minute travel film I directed while an AI agent did the editing in DaVinci Resolve.',
    alt: 'Aerial view of a bay at dusk with dozens of small boats, a pier and dark islands under a pink sky.',
  },
  'film-above-below': {
    image: filmAboveBelow, project: 'film', print: false, dark: true,
    title: 'Above and below', label: 'Above and below',
    caption: 'A split-screen transition in the film: the reef seen from the drone, then from underwater.',
    alt: 'Split frame: shallow turquoise water from above on the left, a coral reef underwater on the right, titled Above and Below.',
  },
  'film-title-reveal': {
    image: filmTitleReveal, project: 'film', print: false, dark: true,
    title: 'Title reveal', label: 'Footage inside the letters',
    caption: 'The film\'s destination title: the footage plays inside the letters, then one stroke opens out to fill the frame. The agent built it as a separate layer so the footage underneath stayed untouched.',
    alt: 'The words LABUAN BAJO in large letters on black, with aerial footage of a harbour and trees visible through the letter shapes.',
  },
  'film-reef': {
    image: filmReef, project: 'film', print: false, dark: true,
    title: 'The reef', label: 'The reef',
    caption: 'Underwater footage cut into the film to the music\'s energy.',
    alt: 'Schools of small fish swimming over a coral reef in clear blue water.',
  },
  'film-energy': {
    image: filmEnergy, project: 'film', print: false, dark: true,
    title: 'Music energy map', label: 'Cut to the beat',
    caption: 'The agent\'s analysis of each track\'s energy over time, used to place the cuts.',
    alt: 'Chart of several music tracks, each a line of loudness over time with marked peaks.',
  },
  'memory-graph': {
    image: memoryGraph, project: 'agentmem', print: false, dark: true,
    title: 'The memory graph', label: 'Notes and how they link',
    caption: 'The notes in the shared memory and the links between them: project hubs with their sessions around them.',
    alt: 'A network graph on a dark background: several hub nodes, each surrounded by dozens of linked smaller nodes.',
  },
} satisfies Record<string, Artifact>;

export type ArtifactId = keyof typeof ARTIFACTS;
export const ARTIFACT_IDS = Object.keys(ARTIFACTS) as [ArtifactId, ...ArtifactId[]];
