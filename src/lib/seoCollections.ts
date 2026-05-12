// Programmatic SEO landing page configs.
// Each entry maps a URL slug → page metadata + product filter rules.

export type SeoCollectionSort = 'popular' | 'latest';

export interface SeoCollectionConfig {
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  // Categories (case-insensitive substring match against product_categories.name).
  // If empty, no category filter is applied.
  categoryKeywords: string[];
  sort: SeoCollectionSort;
  cta: string;
  related: string[]; // slugs of related SEO pages
}

const YEAR = new Date().getFullYear();

export const SEO_COLLECTIONS: SeoCollectionConfig[] = [
  {
    slug: 'best-ai-tools',
    h1: `Best AI Tools in ${YEAR}`,
    title: `Best AI Tools in ${YEAR} | Launch`,
    description: `Discover the best AI tools, apps, and startups launching now. Ranked by upvotes from founders and early adopters on Launch.`,
    intro: `A live, community-ranked list of the best AI tools launching on Launch. Updated daily as new products ship and the community votes. Browse, upvote, and find the perfect tool for your stack.`,
    categoryKeywords: [],
    sort: 'popular',
    cta: 'Launch your AI tool',
    related: ['best-new-ai-tools', 'best-ai-agents', 'best-ai-productivity-tools', 'ai-tools-for-founders'],
  },
  {
    slug: 'best-new-ai-tools',
    h1: `Best New AI Tools in ${YEAR}`,
    title: `Best New AI Tools in ${YEAR} | Launch`,
    description: `Fresh AI tools launching this week. The newest AI startups, apps, and products from indie founders and teams.`,
    intro: `The newest AI tools shipping right now. Sorted by launch date, refreshed every day. See what just launched and upvote the ones you love.`,
    categoryKeywords: [],
    sort: 'latest',
    cta: 'Submit your launch',
    related: ['best-ai-tools', 'best-ai-agents', 'product-hunt-alternatives'],
  },
  {
    slug: 'best-ai-productivity-tools',
    h1: `Best AI Productivity Tools in ${YEAR}`,
    title: `Best AI Productivity Tools in ${YEAR} | Launch`,
    description: `The best AI productivity tools to automate work, save time, and ship faster. Voted by founders on Launch.`,
    intro: `AI productivity tools that help you automate tasks, manage projects, and get more done. Ranked by community upvotes and updated daily.`,
    categoryKeywords: ['productivity', 'workflow', 'automation', 'note', 'task'],
    sort: 'popular',
    cta: 'Submit your productivity tool',
    related: ['best-ai-tools', 'ai-tools-for-founders', 'best-ai-marketing-tools'],
  },
  {
    slug: 'best-ai-marketing-tools',
    h1: `Best AI Marketing Tools in ${YEAR}`,
    title: `Best AI Marketing Tools in ${YEAR} | Launch`,
    description: `Discover the best AI marketing tools, startups, and products launching now. SEO, content, ads, and social — all powered by AI.`,
    intro: `The top AI marketing tools for SEO, content creation, ads, social, and growth. Voted up by marketers and founders. Updated daily.`,
    categoryKeywords: ['marketing', 'seo', 'content', 'social', 'ads', 'growth', 'email'],
    sort: 'popular',
    cta: 'Submit your marketing tool',
    related: ['best-ai-tools', 'best-ai-productivity-tools', 'ai-tools-for-founders'],
  },
  {
    slug: 'best-ai-coding-tools',
    h1: `Best AI Coding Tools in ${YEAR}`,
    title: `Best AI Coding Tools in ${YEAR} | Launch`,
    description: `The best AI coding assistants, dev tools, and developer-focused AI products. Ranked by builders on Launch.`,
    intro: `AI coding tools, copilots, and developer platforms loved by engineers. Updated daily with the latest launches in AI-assisted development.`,
    categoryKeywords: ['developer', 'dev', 'code', 'coding', 'engineering', 'no-code', 'nocode'],
    sort: 'popular',
    cta: 'Submit your dev tool',
    related: ['best-ai-tools', 'best-ai-agents', 'ai-tools-for-founders'],
  },
  {
    slug: 'best-ai-video-tools',
    h1: `Best AI Video Tools in ${YEAR}`,
    title: `Best AI Video Tools in ${YEAR} | Launch`,
    description: `The best AI video tools — generation, editing, avatars, and more. Ranked by creators and founders on Launch.`,
    intro: `AI video tools for generating, editing, and producing video at scale. From avatar generators to automated editors. Updated daily.`,
    categoryKeywords: ['video', 'media', 'creative', 'design'],
    sort: 'popular',
    cta: 'Submit your video tool',
    related: ['best-ai-tools', 'best-ai-marketing-tools', 'best-new-ai-tools'],
  },
  {
    slug: 'best-ai-agents',
    h1: `Best AI Agents in ${YEAR}`,
    title: `Best AI Agents in ${YEAR} | Launch`,
    description: `The best AI agents, autonomous workflows, and agentic apps launching now. Voted by the Launch community.`,
    intro: `Autonomous AI agents that handle real work — research, outreach, code, customer support, and more. Ranked by upvotes, refreshed daily.`,
    categoryKeywords: ['agent', 'assistant', 'chatbot', 'automation'],
    sort: 'popular',
    cta: 'Submit your agent',
    related: ['best-ai-tools', 'best-ai-coding-tools', 'best-new-ai-tools'],
  },
  {
    slug: 'ai-tools-for-founders',
    h1: `AI Tools for Founders in ${YEAR}`,
    title: `AI Tools for Founders & Startups in ${YEAR} | Launch`,
    description: `The best AI tools for founders, indie hackers, and early-stage startups. Save time, ship faster, and grow your company.`,
    intro: `Curated AI tools that founders actually use to build, ship, and scale. From productivity to marketing to dev tools — all upvoted by the Launch community.`,
    categoryKeywords: ['startup', 'founder', 'business', 'productivity', 'marketing'],
    sort: 'popular',
    cta: 'Launch your startup',
    related: ['best-ai-productivity-tools', 'best-ai-marketing-tools', 'best-ai-tools', 'product-hunt-alternatives'],
  },
  {
    slug: 'product-hunt-alternatives',
    h1: `Product Hunt Alternatives in ${YEAR}`,
    title: `Product Hunt Alternatives in ${YEAR} | Launch`,
    description: `Looking for a Product Hunt alternative? Launch is the modern launch platform for AI startups and indie products. Compare and discover.`,
    intro: `Launch is a focused alternative to Product Hunt for AI tools and indie startups — fewer mega-corp products, more real founders, guaranteed dofollow backlinks, and a fairer ranking algorithm. Browse what's launching today.`,
    categoryKeywords: [],
    sort: 'latest',
    cta: 'Launch on Launch',
    related: ['best-new-ai-tools', 'best-ai-tools', 'ai-tools-for-founders'],
  },
];

export const SEO_COLLECTION_SLUGS = SEO_COLLECTIONS.map((c) => c.slug);

export const getSeoCollection = (slug: string | undefined) =>
  SEO_COLLECTIONS.find((c) => c.slug === slug);
