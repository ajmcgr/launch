// Blog taxonomy: content hubs / categories used across the blog homepage,
// category landing pages, and internal linking. Purely derived — no CMS change.

export interface BlogCategory {
  slug: string;
  name: string;
  tagline: string;
  intro: string;
  keywords: string[];
  faqs: { question: string; answer: string }[];
  related: string[]; // other category slugs
}

export const CATEGORIES: BlogCategory[] = [
  {
    slug: 'product-launch',
    name: 'Product Launch',
    tagline: 'Ship it properly, the first time.',
    intro:
      'Everything founders need to plan, run and recover from a launch: Product Hunt playbooks, launch-day checklists, beta testing, startup directories and press timing. These guides are written for solo founders and small teams shipping without a marketing budget.',
    keywords: ['launch', 'product hunt', 'launch day', 'beta', 'directory', 'directories', 'ship'],
    faqs: [
      {
        question: 'When is the best time to launch a startup?',
        answer:
          'Launch when the product solves one problem end to end and you can support the first users. Tuesday to Thursday works best for directories and Product Hunt because weekday traffic is highest.',
      },
      {
        question: 'Where should I launch besides Product Hunt?',
        answer:
          'Launch on multiple directories the same week. Launch (trylaunch.ai), Hacker News, relevant subreddits, niche newsletters and Indie Hackers all send qualified traffic without a follower base.',
      },
    ],
    related: ['distribution', 'launch-playbooks', 'case-studies'],
  },
  {
    slug: 'distribution',
    name: 'Distribution',
    tagline: 'Getting the product in front of people.',
    intro:
      'Distribution is the difference between a product nobody sees and one that compounds. Channel-by-channel breakdowns of Reddit, Hacker News, communities, directories, partnerships and cold outreach — with the numbers founders actually see.',
    keywords: ['distribution', 'channel', 'reddit', 'hacker news', 'community', 'traffic', 'first 100 users', 'cold email'],
    faqs: [
      {
        question: 'What is the fastest distribution channel for a new startup?',
        answer:
          'Communities where your users already gather. A useful Reddit or Slack post can outperform months of SEO in week one, but SEO and directories are what keep traffic coming after launch day.',
      },
    ],
    related: ['marketing', 'seo', 'product-launch'],
  },
  {
    slug: 'marketing',
    name: 'Marketing',
    tagline: 'Positioning, pricing and demand.',
    intro:
      'Practical marketing for technical founders: positioning, messaging, pricing pages, landing pages, onboarding, email and paid experiments that pay for themselves.',
    keywords: ['marketing', 'pricing', 'saas pricing', 'landing page', 'positioning', 'copy', 'conversion', 'email'],
    faqs: [
      {
        question: 'How should an early-stage SaaS price its product?',
        answer:
          'Start with a single simple plan tied to the value metric your users already count. Raise prices after you have ten paying customers and clear retention data.',
      },
    ],
    related: ['branding', 'seo', 'distribution'],
  },
  {
    slug: 'branding',
    name: 'Branding',
    tagline: 'Building a name people remember.',
    intro:
      'Founder brand and product brand: naming, visual identity, building in public, audience building and the compounding effect of being known in your niche.',
    keywords: ['brand', 'branding', 'founder brand', 'build in public', 'audience', 'naming', 'identity'],
    faqs: [
      {
        question: 'Does a founder brand actually help a startup grow?',
        answer:
          'Yes, primarily as a distribution advantage. Founders with an audience get a warm first thousand visitors on every launch instead of starting from zero.',
      },
    ],
    related: ['marketing', 'founder-stories', 'pr'],
  },
  {
    slug: 'pr',
    name: 'PR',
    tagline: 'Press without a press agency.',
    intro:
      'How small teams earn coverage: pitching journalists, building a press kit, timing announcements, HARO-style sourcing and turning launches into stories worth writing about.',
    keywords: ['pr', 'press', 'journalist', 'media', 'coverage', 'press kit', 'pitch'],
    faqs: [
      {
        question: 'Can a startup get press coverage without funding news?',
        answer:
          'Yes. Data, strong opinions and unusual growth stories get covered far more reliably than product announcements. Pitch the story, not the feature list.',
      },
    ],
    related: ['branding', 'marketing', 'case-studies'],
  },
  {
    slug: 'seo',
    name: 'SEO',
    tagline: 'Compounding traffic for startups.',
    intro:
      'Startup SEO that works on a new domain: keyword selection, programmatic pages, backlinks from launches and directories, technical hygiene and optimising for AI search (GEO).',
    keywords: ['seo', 'keyword', 'backlink', 'search', 'google', 'ranking', 'geo', 'ai search', 'indexing'],
    faqs: [
      {
        question: 'How long does SEO take for a new startup?',
        answer:
          'Long-tail pages on a new domain can rank in four to twelve weeks. Competitive head terms usually take six months or more and need links from real sites.',
      },
    ],
    related: ['ai', 'distribution', 'marketing'],
  },
  {
    slug: 'ai',
    name: 'AI',
    tagline: 'Building and marketing AI products.',
    intro:
      'AI startup marketing, vibe coding workflows, model selection, AI-assisted growth and how AI search engines are changing the way founders get discovered.',
    keywords: ['ai', 'llm', 'gpt', 'chatgpt', 'vibe coding', 'agent', 'automation', 'prompt'],
    faqs: [
      {
        question: 'How do you market an AI product without sounding generic?',
        answer:
          'Lead with the outcome and the workflow it replaces, not the model. Buyers care about the hours saved, not the architecture.',
      },
    ],
    related: ['seo', 'marketing', 'product-launch'],
  },
  {
    slug: 'founder-stories',
    name: 'Founder Stories',
    tagline: 'Interviews and field notes.',
    intro:
      'First-hand accounts from founders shipping in public: what worked, what failed, what they would do differently on the next launch.',
    keywords: ['founder', 'interview', 'story', 'indie hacker', 'solo founder', 'journey', 'lessons'],
    faqs: [
      {
        question: 'Can I be featured in a founder story?',
        answer:
          'Yes. Launch your product on trylaunch.ai and share your numbers — most interviews start from a launch we noticed.',
      },
    ],
    related: ['case-studies', 'branding', 'product-launch'],
  },
  {
    slug: 'case-studies',
    name: 'Case Studies',
    tagline: 'Real launches, real numbers.',
    intro:
      'Breakdowns of launches that worked and launches that flopped: traffic, conversion, revenue and the exact tactics behind each outcome.',
    keywords: ['case study', 'breakdown', 'mrr', 'revenue', 'results', 'experiment', 'teardown'],
    faqs: [
      {
        question: 'What makes a good launch case study?',
        answer:
          'Numbers with context: traffic sources, conversion rate, revenue and the decisions behind them. Vanity metrics without context teach nobody anything.',
      },
    ],
    related: ['founder-stories', 'product-launch', 'distribution'],
  },
  {
    slug: 'launch-playbooks',
    name: 'Launch Playbooks',
    tagline: 'Step-by-step, start to finish.',
    intro:
      'Complete, repeatable playbooks: launch week schedules, Product Hunt checklists, directory submission sequences, cold email templates and the assets to prepare before day one.',
    keywords: ['playbook', 'checklist', 'template', 'step by step', 'guide', 'launch week', 'framework'],
    faqs: [
      {
        question: 'What should a launch week look like?',
        answer:
          'Warm up the audience before day one, concentrate directories and Product Hunt mid-week, then spend the rest of the week on communities, press follow-up and turning traffic into signups.',
      },
    ],
    related: ['product-launch', 'distribution', 'case-studies'],
  },
];

export const CATEGORY_BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

/** Topic hubs used by the homepage and internal linking. */
export const HUBS = [
  { slug: 'product-launch', label: 'Product Launch Hub' },
  { slug: 'distribution', label: 'Distribution Hub' },
  { slug: 'seo', label: 'Startup SEO Hub' },
  { slug: 'launch-playbooks', label: 'Playbooks Hub' },
];
