// Blog author registry. Author pages exist for E-E-A-T; posts are mapped
// deterministically by category so newly published articles are included
// automatically with no manual step.

export interface BlogAuthor {
  slug: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  expertise: string[];
  avatar?: string;
  socials: { label: string; url: string }[];
  categories: string[]; // category slugs this author covers
}

export const AUTHORS: BlogAuthor[] = [
  {
    slug: 'alex',
    name: 'Alex',
    role: 'Founder',
    company: 'Launch (trylaunch.ai)',
    bio:
      'Founder of Launch, where thousands of vibe coders and indie founders launch their products every month. Writes about launch strategy, distribution and the mechanics of getting a new product its first users.',
    expertise: ['Product launches', 'Distribution', 'Startup SEO', 'Community growth'],
    socials: [
      { label: 'X', url: 'https://x.com/trylaunchai' },
      { label: 'Launch', url: 'https://trylaunch.ai' },
    ],
    categories: ['product-launch', 'distribution', 'launch-playbooks', 'case-studies', 'founder-stories'],
  },
  {
    slug: 'launch-editorial',
    name: 'The Launch Editorial Team',
    role: 'Editorial',
    company: 'Launch (trylaunch.ai)',
    bio:
      'The Launch editorial team researches and reviews every guide on this blog using launch data from the platform — thousands of product launches, their traffic sources and their outcomes.',
    expertise: ['Marketing', 'Branding', 'PR', 'AI products', 'Search and GEO'],
    socials: [{ label: 'X', url: 'https://x.com/trylaunchai' }],
    categories: ['marketing', 'branding', 'pr', 'seo', 'ai'],
  },
];

export const DEFAULT_AUTHOR = AUTHORS[0];

export const AUTHOR_BY_SLUG = Object.fromEntries(AUTHORS.map((a) => [a.slug, a]));
