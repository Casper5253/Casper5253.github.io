/**
 * The five chapters of the home page: how a problem becomes something people use, and what comes after.
 * This is a recurring way of working, not a timeline. Each project appears in exactly one chapter, the one it shows best
 * (its Markdown file names it under `home`). This file holds the chapter's own words.
 */
export const STAGE_IDS = ['understand', 'build', 'refine', 'deliver', 'learn'] as const;
export type StageId = (typeof STAGE_IDS)[number];

/** The shape the background field settles into while the chapter is on screen. */
export type Formation = 'gather' | 'lattice' | 'orbit' | 'fanout' | 'spiral';

/** Concept diagrams are illustrations drawn from verified facts, never reconstructions of client systems. */
export const DIAGRAM_IDS = ['knowledge', 'quantlab-journey', 'dq', 'crisis'] as const;
export type DiagramId = (typeof DIAGRAM_IDS)[number];

export interface Stage {
  id: StageId;
  title: string;
  short?: string;
  /** The line under the title in the opening overview. */
  overview: string;
  /** The chapter's standfirst. */
  line: string;
  body: string[];
  learned: string;
  formation: Formation;
}

export const STAGES: Stage[] = [
  {
    id: 'understand',
    title: 'Understand the problem',
    overview: 'Talk to the people. Find the real need.',
    line: 'It usually starts with a conversation. My first job is to find out what someone is trying to do, and why.',
    body: [
      'I enjoy these conversations more than almost anything else in the work. I ask a lot of questions: about the task, the people around it, the systems underneath, and the constraints nobody mentions at first. The request on day one is rarely the whole problem. We find it together: I learn how their work gets done, they see what the technology can do, and we agree on a plan that fits both.',
      'Most of my consulting has been in financial services, especially banking. I have worked with everyone from interns to the C-suite, run workshops and trainings, and led small project teams. Much of the job is translation, between what the business means and what the technology can do.',
    ],
    learned: 'The best plan is one we work out together, once we understand how each of us sees the problem.',
    formation: 'gather',
  },
  {
    id: 'build',
    title: 'Build the first working thing',
    short: 'Build it',
    overview: 'Turn the idea into software that works.',
    line: 'Get from a conversation to something people can use, quickly, without building an impressive demo that falls over.',
    body: [
      'Once the problem is clear I like to get to working software fast. That means choosing a sensible approach, keeping the first version small, and making sure it does the real job end to end before it does anything clever.',
      'Sometimes that takes a team and a few weeks. Sometimes, with a team of AI agents and clear rules, it takes a day.',
    ],
    learned: 'First make it, then make it better.',
    formation: 'lattice',
  },
  {
    id: 'refine',
    title: 'Refine it with real feedback',
    short: 'Refine it',
    overview: 'Put it in front of people. Listen. Adapt.',
    line: 'Put the first version in front of the people who will use it, listen carefully, and make it fit how they work rather than the general case.',
    body: [
      'This is where something generic becomes genuinely useful. Feedback shows what is missing, which assumptions were wrong, and what people reach for. I want it at every stage, not only at the end: show me what it should do, say or look like, and we change it. With today\'s tools, the change itself is rarely the hard part.',
      'I work the same way on my own projects. Nothing an AI agent writes counts until a different model has reviewed it, and then I review the result myself. The film below went through three full cuts and four creative passes; this website went through four rounds of exploration and about forty versions before I approved its direction.',
    ],
    learned: 'Welcome feedback at every stage. A thing shaped by the people who use it goes further than one person\'s first idea.',
    formation: 'orbit',
  },
  {
    id: 'deliver',
    title: 'Deliver it and help people use it',
    short: 'Deliver it',
    overview: 'Make it work where people work.',
    line: 'Working on my machine is not the finish line. It has to fit how people work, keep working, and be handed over properly.',
    body: [
      'Delivery is integration, reliability, documentation, training and support: everything that decides whether a tool is still in use a month later. It is the least glamorous stage, and the one that proves the work.',
      'Some of what I build I deliver to myself first. The agent tools I run every day had to survive daily use before I trusted them with real work.',
    ],
    learned: 'I want to build real things that people use, for problems they actually have.',
    formation: 'fanout',
  },
  {
    id: 'learn',
    title: 'Learn, improve, repeat',
    overview: 'Look back honestly. Take it to the next one.',
    line: 'Look back at what worked and what did not, honestly, and bring it into the next problem.',
    body: [
      'I like to measure instead of guess. Which model is worth its cost? Does that famous strategy really work? Often the honest answer is less exciting than the hoped-for one, and it is still the answer.',
      'Every project leaves something reusable behind: a rule, a checklist, a tool. I keep them where the next project, and the next agent, can find them. That is how the next one starts further ahead.',
    ],
    learned: 'Most failures are an unclear brief or missing context, not a weak model.',
    formation: 'spiral',
  },
];
