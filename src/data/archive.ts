import type { ImageMetadata } from 'astro';
import v1Metro from '../assets/archive/v1-metro.jpg';
import round1FieldGuide from '../assets/archive/r1-field-guide.jpg';
import round2GoodQuestions from '../assets/archive/r2-good-questions.jpg';
import round3Object from '../assets/archive/r3-object.jpg';
import round4Contents from '../assets/archive/r4-contents.jpg';
import consolidationNetwork from '../assets/archive/c-network.jpg';
import consolidationEditorial from '../assets/archive/c-editorial.jpg';
import phase2Essay from '../assets/archive/phase-2-a-essay.jpg';
import phase2OperatingPicture from '../assets/archive/phase-2-b-operating-picture.jpg';
import phase2Chapters from '../assets/archive/phase-2-c-chapters.jpg';
import phase25Depth from '../assets/archive/phase-2-5-depth.jpg';
import phase25MadeThings from '../assets/archive/phase-2-5-made-things.jpg';
import phase25Thread from '../assets/archive/phase-2-5-thread.jpg';
import phase26Integrated from '../assets/archive/phase-2-6-integrated.jpg';

export interface ArchiveEntry {
  id: string;
  image: ImageMetadata;
  name: string;
  when: string;
  verdict: string;
}

export const archive: ArchiveEntry[] = [
  {
    id: 'v1-metro',
    image: v1Metro,
    name: 'The Line Map',
    when: 'V1',
    verdict: 'Connected story, excellent train service; unfortunately, I do not particularly care about trains.',
  },
  {
    id: 'round-1-field-guide',
    image: round1FieldGuide,
    name: 'Field Guide',
    when: 'Round 1',
    verdict: 'Starting from the old map and my hobbies left little room for another answer.',
  },
  {
    id: 'round-2-good-questions',
    image: round2GoodQuestions,
    name: 'Good Questions',
    when: 'Round 2',
    verdict: 'Different premises, surprisingly similar page skeletons.',
  },
  {
    id: 'round-3-object',
    image: round3Object,
    name: 'Useful, by Construction',
    when: 'Round 3',
    verdict: 'A finely made instrument; its engraved text was still small on mobile.',
  },
  {
    id: 'round-4-contents',
    image: round4Contents,
    name: 'Contents',
    when: 'Round 4',
    verdict: 'Research made it credible; the results also looked more like ordinary websites.',
  },
  {
    id: 'consolidation-network',
    image: consolidationNetwork,
    name: 'Network',
    when: 'Consolidation',
    verdict: 'The map gained skill evidence, but remained wider than a phone.',
  },
  {
    id: 'consolidation-editorial',
    image: consolidationEditorial,
    name: 'Editorial',
    when: 'Consolidation',
    verdict: 'A proper portfolio; the brief had moved on to atmosphere and evidence.',
  },
  {
    id: 'phase-2-essay',
    image: phase2Essay,
    name: 'The Essay',
    when: 'Phase 2 · A',
    verdict: 'A good voice and a quiet interaction; the loop did not earn its keep.',
  },
  {
    id: 'phase-2-operating-picture',
    image: phase2OperatingPicture,
    name: 'The Operating Picture',
    when: 'Phase 2 · B',
    verdict: 'It felt cramped and gimmicky, which is a thorough two-for-two.',
  },
  {
    id: 'phase-2-chapters',
    image: phase2Chapters,
    name: 'Chapters',
    when: 'Phase 2 · C',
    verdict: 'The structure held; the chapter labels were our interpretation, not my story.',
  },
  {
    id: 'phase-2-5-depth',
    image: phase25Depth,
    name: 'Depth',
    when: 'Phase 2.5 · Experiment 1',
    verdict: 'The field gave the page atmosphere, but told visitors little about the work.',
  },
  {
    id: 'phase-2-5-made-things',
    image: phase25MadeThings,
    name: 'Made Things',
    when: 'Phase 2.5 · Experiment 2',
    verdict: 'The evidence landed; the light paper did not belong on a night-only site.',
  },
  {
    id: 'phase-2-5-thread',
    image: phase25Thread,
    name: 'The Thread',
    when: 'Phase 2.5 · Experiment 3',
    verdict: 'The line explained the story; the prints and field had more to say.',
  },
  {
    id: 'phase-2-6-integrated',
    image: phase26Integrated,
    name: 'The Integrated Prototype',
    when: 'Phase 2.6',
    verdict: 'Not rejected, exactly: I called it “This is it.” The production build came next.',
  },
];
