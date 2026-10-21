/**
 * Who I am, in one place. The home page, the About & CV page, the CV PDF and the page metadata all read from here.
 * Career facts are checked against Casper's LinkedIn export (October 2026); the export itself is never published.
 */
export const PROFILE = {
  name: 'Casper van Tongeren',
  title: 'Senior Consultant, AI & Data',
  employer: 'Deloitte',
  location: 'Singapore',
  email: 'casper5253@gmail.com',
  links: {
    github: 'https://github.com/Casper5253',
    linkedin: 'https://www.linkedin.com/in/caspervtongeren',
    film: 'https://www.youtube.com/watch?v=hw7poE2moXo',
  },
  thesis:
    'Someone tells me about a thing they wish existed. I listen until I understand what they need, build it so it really works, and make sure it answers the question they started with.',
  intro:
    'I am a consultant in AI and data at Deloitte in Singapore, with a background in data engineering, analytics and data management. Outside client work I build with a team of AI coding agents I set up and direct myself. I am happiest where people and engineering meet: close to the problem, from the first conversation to the thing in use.',
  closing: {
    heading: 'What I want to do more of',
    body: 'That loop, from a conversation about something someone wishes existed to a thing they use, and back again, is the work I enjoy most. Forward-deployed engineering is one name for it. Whatever the title, I want to be doing as much of it as I can.',
    invite: 'Something you wish existed? Tell me about it.',
  },
  personal:
    'Away from work I read a lot of fantasy and science fiction, build LEGO, dance, and make videos. Mostly I just like making things. Some of them even turn out to be useful.',
  summary:
    'Consultant in AI and data with a background in data engineering, analytics and data management, mostly in financial services. I work from the first conversation with the people who have the problem to a solution they use: discovery, a first working version, refinement with real feedback, and delivery. Outside client work I build and run a team of AI coding agents with routing, review and shared memory, and use it to take ideas to working, verified prototypes quickly.',
  experience: [
    {
      org: 'Deloitte',
      role: 'Senior Consultant, AI & Data',
      place: 'Singapore',
      period: 'September 2025 to now',
      points: [
        'Consultant from September 2025; Senior Consultant since September 2026.',
        'AI engineer in a large knowledge-transformation programme: helping build a graph-enriched knowledge base on an ontology and knowledge graph, with a focus on the front end and the screens shaped by client requirements.',
        'Financial services focus, especially banking. Works with stakeholders from junior team members to senior leadership; leads small project teams, coaches and gives trainings.',
      ],
    },
    {
      org: 'Deloitte',
      role: 'Analyst, then Consultant, Data Engineering, Financial Risk Advisory',
      place: 'Netherlands',
      period: 'February 2023 to August 2025',
      points: [
        'Technical lead and client demonstrations for a generative-AI data-quality tool: from a 3% data sample to dataset profiles, data-quality requirements across the six DAMA-DMBOK dimensions, and executable checks. Demonstrated several times to clients across the Netherlands.',
        'Part of the team that built an early generative-AI crisis simulation generator (Python, Streamlit, ChatGPT API), adopted by the receiving team to automate scenario preparation.',
        'Data engineering, analytics and data management engagements in financial services.',
      ],
    },
    {
      org: 'University of Amsterdam',
      role: 'Teaching Assistant',
      place: 'Amsterdam',
      period: 'September to December 2022',
      points: [],
    },
    {
      org: 'ABN AMRO MeesPierson',
      role: 'Intern, then Data Analyst, then Business Intelligence Developer',
      place: 'Amsterdam',
      period: 'September 2020 to June 2022',
      points: [
        'Built and maintained Power BI dashboards on client and KPI data (Power BI, SQL, Python), working directly with end users and stakeholders and presenting to large groups.',
      ],
    },
  ],
  education: [
    { degree: 'MSc Psychology: Behavioural Data Science', school: 'University of Amsterdam · 2021 to 2022' },
    { degree: 'BSc Psychology', school: 'Vrije Universiteit Amsterdam · 2016 to 2020, with an exchange minor at Nanyang Technological University, Singapore (2019)' },
  ],
  languages: ['Dutch', 'English'],
  skills: [
    { group: 'Data and AI', items: ['Python', 'SQL', 'Data engineering', 'Analytics', 'Data management and data quality (DAMA-DMBOK)', 'Generative AI applications', 'LangChain', 'Streamlit', 'Knowledge graphs and ontologies'] },
    { group: 'Agentic engineering', items: ['Multi-agent coding workflows (Claude Code, Codex, OpenCode)', 'Model routing and evaluation', 'Automated review and verification'] },
    { group: 'Working with people', items: ['Requirements discovery', 'Workshops and training', 'Stakeholder management up to C-suite', 'Leading small project teams', 'Coaching'] },
  ],
  /** Unfinished concepts, mentioned for range only. */
  alsoExploring: ['A paper-trading engine', 'A reading dashboard', 'A usage overlay for AI subscriptions', 'A world-building tool'],
} as const;
