import type { AlternativePageConfig } from './types';

export const alternativesPages: AlternativePageConfig[] = [
  {
    kind: 'alternative',
    slug: 'product-hunt',
    targetTool: 'Product Hunt',
    title: 'Product Hunt Alternatives in 2026 (Ranked)',
    metaDescription:
      'Ranked Product Hunt alternatives for AI startups and indie founders — fairer ranking, real traffic, dofollow links.',
    h1: 'Product Hunt Alternatives in 2026',
    intro:
      'Product Hunt is still the most-known launch platform, but founders increasingly look elsewhere. The complaints are familiar: hunter dynamics, nofollow links, AI saturation, and a vibe that favors polished mega-launches over indie shipping. Here are the alternatives that actually convert in 2026 — ranked by what you walk away with after launch day.',
    whoIsItFor: 'Indie hackers and AI founders frustrated with the Product Hunt experience, or looking to layer alternatives on top of a PH launch.',
    whyAlternatives:
      'Three things push founders to alternatives: (1) Product Hunt\'s nofollow links mean no SEO benefit; (2) hunter dynamics still influence first-hour visibility; (3) AI-tagged products are deprioritized in the algorithm.',
    items: [
      { name: 'Launch', oneLiner: 'AI- and indie-focused launch board with dofollow links and fair ranking.', pros: ['Dofollow backlinks', 'No hunter required', 'Same-day launch on Pro', 'Active Discourse forum'], cons: ['Smaller audience than PH'], internal: '/submit', bestFor: 'AI tools and indie SaaS that want real backlinks.' },
      { name: 'BetaList', oneLiner: 'Pre-launch list, better for waitlist building than upvote events.', pros: ['Engaged early adopters', 'Dofollow'], cons: ['Paid to skip the queue', 'Small daily volume'], url: 'https://betalist.com', bestFor: 'Pre-launch beta signup collection.' },
      { name: 'Peerlist', oneLiner: 'Professional network with a launch board — high signal, low volume.', pros: ['Quality maker audience', 'Profile network effects'], cons: ['Smaller audience'], url: 'https://peerlist.io', bestFor: 'Solo devs and small teams.' },
      { name: 'Show HN (Hacker News)', oneLiner: 'Brutal but high-leverage when it lands.', pros: ['Massive spike if you hit the front page'], cons: ['Unpredictable', 'Hostile to marketing-speak'], url: 'https://news.ycombinator.com', bestFor: 'Developer-facing or technically novel products.' },
      { name: 'Uneed', oneLiner: 'Curated weekly newsletter and launch board.', pros: ['Newsletter syndication', 'Curated quality'], cons: ['Weekly cadence'], url: 'https://www.uneed.best', bestFor: 'Indie SaaS that fits a curated weekly slot.' },
      { name: 'Microlaunch', oneLiner: 'Minimal launch board for indie projects.', pros: ['Free', 'Zero friction'], cons: ['Smaller audience'], url: 'https://microlaunch.net', bestFor: 'Side projects.' },
    ],
    table: {
      columnHeaders: ['Platform', 'Dofollow', 'Audience', 'Hunter needed', 'Price floor'],
      rows: [
        { feature: 'Launch', values: ['Launch', 'Yes', 'Mid', 'No', 'Free'], winnerIndex: -1 },
        { feature: 'BetaList', values: ['BetaList', 'Yes', 'Small', 'No', '$129+ to skip queue'], winnerIndex: -1 },
        { feature: 'Peerlist', values: ['Peerlist', 'Yes', 'Small', 'No', 'Free'], winnerIndex: -1 },
        { feature: 'Show HN', values: ['Show HN', 'Yes', 'Variable', 'No', 'Free'], winnerIndex: -1 },
        { feature: 'Uneed', values: ['Uneed', 'Yes', 'Small', 'No', 'Free / Paid'], winnerIndex: -1 },
        { feature: 'Microlaunch', values: ['Microlaunch', 'Yes', 'Small', 'No', 'Free'], winnerIndex: -1 },
      ],
    },
    faqs: [
      { question: 'What is the best Product Hunt alternative in 2026?', answer: 'Launch is the closest direct alternative for AI tools and indie SaaS — dofollow links, fair ranking, no hunter required. BetaList is better if you need beta signups instead of an upvote event.' },
      { question: 'Should I launch on Product Hunt and an alternative?', answer: 'Yes. Stagger them 7–14 days apart. Most successful founders use 5–10 channels over a 2-week launch window.' },
      { question: 'Do Product Hunt alternatives pass SEO link equity?', answer: 'Launch, BetaList, Peerlist, Show HN, Uneed, and Microlaunch all pass dofollow links. Product Hunt does not.' },
    ],
    related: [
      { label: 'Best product launch platforms', to: '/best/launch-platforms' },
      { label: 'Best places to launch a SaaS', to: '/best/places-to-launch-saas' },
      { label: 'BetaList alternatives', to: '/alternatives/betalist' },
      { label: 'Compare Launch vs Product Hunt', to: '/compare/launch-vs-product-hunt' },
    ],
    ctaHeading: 'Launch on Launch — it\'s free',
    ctaBody: 'Dofollow backlinks, fair ranking, no hunter required.',
    ctaPrimary: { label: 'Submit your product', to: '/submit' },
  },
  {
    kind: 'alternative',
    slug: 'betalist',
    targetTool: 'BetaList',
    title: 'BetaList Alternatives for 2026',
    metaDescription:
      'The best BetaList alternatives for early-stage founders. Compared on traffic, audience, and pricing.',
    h1: 'BetaList Alternatives in 2026',
    intro:
      'BetaList works for one specific job: collecting beta signups before launch. The complaints are usually about the paid queue-skip price and the limited daily traffic. If you are pre-launch and want either a free alternative or a different audience, here are the options that founders actually use.',
    whoIsItFor: 'Pre-launch founders building a waitlist or beta signup list.',
    whyAlternatives:
      'BetaList\'s queue-skip pricing has climbed, daily traffic is limited, and the audience skews early-adopter consumer. Founders looking for indie/B2B audiences or dofollow SEO benefits often need a second option.',
    items: [
      { name: 'Launch', oneLiner: 'Launch board with dofollow links — works for both pre-launch and launched products.', pros: ['Free', 'Dofollow backlinks', 'AI + indie audience'], cons: ['Optimized for launches, not pure waitlist'], internal: '/submit', bestFor: 'Pre-launch SaaS and AI tools.' },
      { name: 'Peerlist', oneLiner: 'Maker-focused network with a Launchpad and a Coming Soon feed.', pros: ['Quality maker audience', 'Free'], cons: ['Smaller'], url: 'https://peerlist.io', bestFor: 'Solo devs and small teams.' },
      { name: 'Product Hunt Coming Soon', oneLiner: 'PH\'s waitlist feature for pre-launch products.', pros: ['Reaches PH audience early', 'Free'], cons: ['Nofollow'], url: 'https://www.producthunt.com/coming-soon', bestFor: 'Consumer products planning a PH launch.' },
      { name: 'IndieHackers (Forum)', oneLiner: 'Post in the IndieHackers community asking for beta testers.', pros: ['Free', 'Engaged founder audience'], cons: ['Not a structured beta list'], url: 'https://www.indiehackers.com', bestFor: 'B2B / indie SaaS.' },
      { name: 'Uneed', oneLiner: 'Curated weekly newsletter — includes a pre-launch section.', pros: ['Curated quality', 'Newsletter syndication'], cons: ['Weekly cadence'], url: 'https://www.uneed.best', bestFor: 'Curated weekly distribution.' },
    ],
    faqs: [
      { question: 'Is BetaList worth it in 2026?', answer: 'For pure beta signup collection, yes — but the free queue is slow and paid placement has gotten expensive. Launch and Peerlist are strong free alternatives.' },
      { question: 'What\'s the best free alternative to BetaList?', answer: 'Launch is the most direct free alternative with the bonus of dofollow backlinks. Peerlist works well for maker-focused products.' },
      { question: 'Can I list on BetaList and an alternative at the same time?', answer: 'Yes — there is no exclusivity. Most founders cover 3–4 pre-launch boards.' },
    ],
    related: [
      { label: 'Best product launch platforms', to: '/best/launch-platforms' },
      { label: 'Product Hunt alternatives in 2026', to: '/alternatives/product-hunt' },
      { label: 'Compare Launch vs BetaList', to: '/vs/launch-vs-betalist' },
    ],
    ctaHeading: 'List your product on Launch',
    ctaBody: 'Free, dofollow backlinks, indie + AI audience. No queue tax.',
    ctaPrimary: { label: 'Submit your product', to: '/submit' },
  },
  {
    kind: 'alternative',
    slug: 'hacker-news',
    targetTool: 'Show HN (Hacker News)',
    title: 'Show HN Alternatives for Launching',
    metaDescription:
      'Where to launch besides Show HN — focused communities for AI tools and indie SaaS.',
    h1: 'Show HN Alternatives in 2026',
    intro:
      'Show HN is high-leverage but high-variance. Most posts never break out, and the audience is hostile to anything that smells like marketing. If you need a more predictable launch outcome — or your product is not technically interesting enough for HN — these are the alternatives that work for the same kind of indie/developer audience.',
    whoIsItFor: 'Indie devs and small teams who tried (or considered) Show HN and want a more reliable channel.',
    whyAlternatives:
      'Show HN is unpredictable: title formatting matters, marketing-flavored posts get downvoted, and most submissions never reach the front page. Founders need at least one reliable channel alongside it.',
    items: [
      { name: 'Launch', oneLiner: 'Launch board with dofollow links and an indie/AI audience.', pros: ['Predictable visibility', 'Dofollow', 'Active community'], cons: ['Smaller audience than HN front page'], internal: '/submit', bestFor: 'Indie SaaS and AI tools.' },
      { name: 'IndieHackers', oneLiner: 'Community forum with a milestone feed.', pros: ['Engaged founder audience', 'Free'], cons: ['Forum dynamics'], url: 'https://www.indiehackers.com', bestFor: 'Bootstrapped milestones and SaaS.' },
      { name: 'r/SideProject, r/SaaS, r/EntrepreneurRideAlong', oneLiner: 'Subreddits with active founder audiences.', pros: ['Free', 'Niche fit'], cons: ['Mod rules vary'], url: 'https://reddit.com/r/SideProject', bestFor: 'Solo founders and indie SaaS.' },
      { name: 'lobste.rs', oneLiner: 'Invite-only technical community — quieter, higher signal than HN.', pros: ['Quality discussion'], cons: ['Invite required'], url: 'https://lobste.rs', bestFor: 'Open-source and devtools.' },
      { name: 'Peerlist', oneLiner: 'Professional network with a Launchpad.', pros: ['Quality audience', 'Free'], cons: ['Smaller'], url: 'https://peerlist.io', bestFor: 'Solo devs and small teams.' },
    ],
    faqs: [
      { question: 'What is the most predictable alternative to Show HN?', answer: 'Launch — listings are published on a known schedule with consistent visibility, unlike HN\'s lottery-style front page.' },
      { question: 'Can I post on Show HN and Launch at the same time?', answer: 'Yes. They have completely different audiences and there is no penalty for cross-posting on different days.' },
      { question: 'What kinds of products do well on Show HN?', answer: 'Technically novel work — new models, open source tools, clever architectures. Marketing-flavored "AI for X" posts get crushed.' },
    ],
    related: [
      { label: 'Best places to launch an AI product', to: '/best/places-to-launch-ai-product' },
      { label: 'Best places to launch a SaaS', to: '/best/places-to-launch-saas' },
      { label: 'Compare Launch vs Hacker News', to: '/compare/launch-vs-hacker-news' },
    ],
    ctaHeading: 'Get predictable launch visibility',
    ctaBody: 'Dofollow links, scheduled publishing, focused indie + AI audience.',
    ctaPrimary: { label: 'Submit your product', to: '/submit' },
  },
];

export const alternativesPagesBySlug = Object.fromEntries(alternativesPages.map((p) => [p.slug, p]));
