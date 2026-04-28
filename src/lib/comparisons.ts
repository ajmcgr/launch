// Data driving the /compare hub. Designed for AI-citation friendly structure:
// clear comparison tables, definitive lists, Q&A.

export interface ComparisonRow {
  feature: string;
  launch: string;
  competitor: string;
  winner?: 'launch' | 'competitor' | 'tie';
}

export interface Comparison {
  slug: string;
  competitor: string;
  competitorUrl: string;
  oneLiner: string;
  metaDescription: string;
  summary: string;
  whoIsItFor: { launch: string; competitor: string };
  rows: ComparisonRow[];
  pricing: { launch: string; competitor: string };
  verdict: string;
  faqs: { question: string; answer: string }[];
}

const launchPricing = 'Free launch (queued ~7 days), Pro $39 (instant launch), Pass $99/yr (unlimited launches)';

export const comparisons: Comparison[] = [
  {
    slug: 'launch-vs-product-hunt',
    competitor: 'Product Hunt',
    competitorUrl: 'https://www.producthunt.com',
    oneLiner: 'A focused launchpad for indie makers vs. the largest mainstream product directory.',
    metaDescription:
      'Launch vs Product Hunt in 2026: compare pricing, ranking algorithm, audience, dofollow backlinks and visibility for indie makers.',
    summary:
      'Product Hunt is the biggest product launch site on the internet, but its scale means most launches get drowned out by the top 5 of the day. Launch is a smaller, focused alternative built for indie makers and AI founders who want real upvotes, real feedback and dofollow backlinks — not a popularity contest hijacked by hunters.',
    whoIsItFor: {
      launch: 'Indie makers, solo founders, AI builders shipping side-projects who want a fair shot at visibility.',
      competitor: 'Funded startups with a network and budget for a coordinated launch day.',
    },
    rows: [
      { feature: 'Submission cost', launch: 'Free (queued) or $39 Pro', competitor: 'Free' },
      { feature: 'Approval time', launch: 'Instant for Pro/Pass, ~7 days for Free', competitor: 'Manual review, can be days/weeks' },
      { feature: 'Dofollow backlink', launch: 'Yes, by default', competitor: 'Nofollow', winner: 'launch' },
      { feature: 'Hunter-required', launch: 'No', competitor: 'Effectively yes for visibility', winner: 'launch' },
      { feature: 'Verified MRR badge', launch: 'Yes (Stripe Connect)', competitor: 'No', winner: 'launch' },
      { feature: 'AI / LLM optimization', launch: 'llms.txt + open AI bot rules', competitor: 'Limited' },
      { feature: 'Community size', launch: 'Smaller, focused', competitor: 'Massive, noisy', winner: 'competitor' },
      { feature: 'Newsletter reach', launch: '2K+ engaged makers', competitor: '1M+ subscribers', winner: 'competitor' },
    ],
    pricing: { launch: launchPricing, competitor: 'Free to launch; paid promo via Ship ($79/mo+)' },
    verdict:
      'Choose Product Hunt if you have a network and budget for a launch-day push. Choose Launch if you want consistent visibility, a dofollow backlink and a fair ranking algorithm without needing a hunter.',
    faqs: [
      {
        question: 'Is Launch a Product Hunt alternative?',
        answer:
          'Yes — Launch is a focused alternative to Product Hunt designed for indie makers and AI founders. It offers dofollow backlinks, instant Pro launches, and verified MRR badges that Product Hunt does not provide.',
      },
      {
        question: 'Can I launch on both Product Hunt and Launch?',
        answer:
          'Absolutely. Many makers launch on Launch first to gather initial momentum and feedback, then run a coordinated Product Hunt launch a week or two later.',
      },
      {
        question: 'Does Launch have hunters like Product Hunt?',
        answer:
          'No. Anyone can submit their own product directly. There is no hunter system, which removes the gatekeeping that often hurts solo makers on Product Hunt.',
      },
    ],
  },
  {
    slug: 'launch-vs-betalist',
    competitor: 'BetaList',
    competitorUrl: 'https://betalist.com',
    oneLiner: 'Live product launches and ongoing visibility vs. pre-launch beta signups.',
    metaDescription:
      'Launch vs BetaList: compare pricing, audience, backlink quality and post-launch visibility for indie startups in 2026.',
    summary:
      'BetaList is built for collecting early-access signups before a product is live. Launch is built for the actual launch and the long tail after. Most makers use BetaList once, then need a real launch platform — Launch fills that gap and keeps your product discoverable in archives, tags and tech pages indefinitely.',
    whoIsItFor: {
      launch: 'Makers ready to ship a live product and want ongoing SEO visibility.',
      competitor: 'Pre-launch founders collecting beta signups before MVP.',
    },
    rows: [
      { feature: 'Stage', launch: 'Live products', competitor: 'Pre-launch / beta' },
      { feature: 'Dofollow backlink', launch: 'Yes', competitor: 'Nofollow', winner: 'launch' },
      { feature: 'Submission cost', launch: 'Free or $39', competitor: 'Free (slow) or $129 (priority)' },
      { feature: 'Time to publish', launch: 'Same-day for Pro', competitor: '4–6 weeks free / 24h paid' },
      { feature: 'Permanent archive page', launch: 'Yes, indexed', competitor: 'Yes' },
      { feature: 'Tech stack discovery', launch: 'Yes — /tech pages', competitor: 'No', winner: 'launch' },
      { feature: 'Verified revenue', launch: 'Yes', competitor: 'No', winner: 'launch' },
    ],
    pricing: { launch: launchPricing, competitor: 'Free (slow queue) or $129 priority' },
    verdict:
      'Use BetaList for pre-launch signups. Use Launch the day you go live — and keep using it for every relaunch and update.',
    faqs: [
      {
        question: 'Should I use BetaList or Launch?',
        answer:
          'Use BetaList before your product is live to collect beta signups. Use Launch the day you publicly launch and want ongoing discoverability, upvotes and dofollow backlinks.',
      },
      {
        question: 'Is Launch cheaper than BetaList?',
        answer:
          'Yes. Launch Pro is $39 for an instant launch vs BetaList’s $129 priority listing. Free launches are also available on Launch (with a queue).',
      },
    ],
  },
  {
    slug: 'launch-vs-peerlist',
    competitor: 'Peerlist',
    competitorUrl: 'https://peerlist.io',
    oneLiner: 'Product launches with maker scoring vs. a developer-focused professional network.',
    metaDescription:
      'Launch vs Peerlist: which platform is better for launching an indie product in 2026? Compare audience, ranking and backlinks.',
    summary:
      'Peerlist is primarily a professional network for developers — Project Spotlight is a secondary feature. Launch is purpose-built for product launches with daily/weekly leaderboards, verified revenue, and a Maker Score that compounds over time as you launch more products and engage with the community.',
    whoIsItFor: {
      launch: 'Makers who want a focused product launch venue with leaderboards and SEO.',
      competitor: 'Developers building a professional profile and portfolio.',
    },
    rows: [
      { feature: 'Primary purpose', launch: 'Product launches', competitor: 'Developer profiles' },
      { feature: 'Daily leaderboard', launch: 'Yes', competitor: 'No', winner: 'launch' },
      { feature: 'Maker Score / karma', launch: 'Yes (+10 launch, +5 review, +20 boost)', competitor: 'No', winner: 'launch' },
      { feature: 'Dofollow backlink', launch: 'Yes', competitor: 'Nofollow', winner: 'launch' },
      { feature: 'Tech stack pages', launch: 'Yes', competitor: 'Limited' },
      { feature: 'Verified MRR', launch: 'Yes', competitor: 'No', winner: 'launch' },
    ],
    pricing: { launch: launchPricing, competitor: 'Free; paid Pro plan for profile features' },
    verdict:
      'Use Peerlist to build your developer profile. Use Launch when you have something to actually launch.',
    faqs: [
      {
        question: 'Is Launch better than Peerlist for launching products?',
        answer:
          'Yes. Launch is purpose-built for product launches with daily leaderboards, verified MRR badges, and a Maker Score system. Peerlist is primarily a developer professional network.',
      },
    ],
  },
  {
    slug: 'launch-vs-uneed',
    competitor: 'Uneed',
    competitorUrl: 'https://uneed.best',
    oneLiner: 'Maker-first launch with verified revenue vs. a curated tools directory.',
    metaDescription:
      'Launch vs Uneed in 2026: compare pricing, ranking system, dofollow backlinks and audience for indie product launches.',
    summary:
      'Uneed is a curated weekly directory with limited daily slots. Launch lets anyone submit on any day with no editorial bottleneck, and stacks programmatic SEO around tags, tech pages and permanent archive URLs to keep your product discoverable long after launch day.',
    whoIsItFor: {
      launch: 'Any indie maker who wants instant or queued launching with no curation lottery.',
      competitor: 'Makers with polished products willing to wait for editorial selection.',
    },
    rows: [
      { feature: 'Submission model', launch: 'Open, anyone can submit', competitor: 'Curated, limited slots' },
      { feature: 'Dofollow backlink', launch: 'Yes', competitor: 'Yes', winner: 'tie' },
      { feature: 'Time to publish', launch: 'Instant for Pro, ~7 days free', competitor: 'Weeks for free, paid skip' },
      { feature: 'Permanent SEO pages', launch: 'Tag + category + tech + daily archive', competitor: 'Category pages' },
      { feature: 'Verified MRR badge', launch: 'Yes', competitor: 'No', winner: 'launch' },
      { feature: 'Community voting', launch: 'Yes', competitor: 'Limited' },
    ],
    pricing: { launch: launchPricing, competitor: 'Free (curated) or paid skip-the-queue' },
    verdict:
      'Pick Uneed for editorial credibility on a curated list. Pick Launch for open submission, faster publish, and a richer SEO surface area.',
    faqs: [
      {
        question: 'Is Launch easier to get on than Uneed?',
        answer:
          'Yes. Launch is open submission — anyone can submit a product. Uneed is curated, so you may wait weeks or be passed over entirely.',
      },
    ],
  },
];

export function findComparison(slug: string): Comparison | undefined {
  return comparisons.find((c) => c.slug === slug);
}
