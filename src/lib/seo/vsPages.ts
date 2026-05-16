import type { VsPageConfig } from './types';

export const vsPages: VsPageConfig[] = [
  {
    kind: 'vs',
    slug: 'launch-vs-betalist',
    competitor: 'BetaList',
    title: 'Launch vs BetaList — Which Is Better 2026',
    metaDescription:
      'Launch vs BetaList compared on traffic, audience, pricing, dofollow links, and indie-founder fit.',
    h1: 'Launch vs BetaList',
    oneLiner: 'Launch is a daily-cadence launch board for AI tools and indie SaaS. BetaList is a pre-launch waitlist board.',
    intro: 'Both platforms help early-stage founders get in front of an audience, but they solve different problems.',
    summary:
      'Use BetaList when you want beta signups before launch. Use Launch when you want a launch event with upvotes, dofollow backlinks, and discovery from an active indie/AI audience. The two are complementary — a common play is BetaList in the weeks before launch and Launch on launch day.',
    whoIsItFor: 'Founders deciding between a pre-launch waitlist board and a launch-day event board.',
    whoForLaunch: 'Indie SaaS and AI tool founders who want a launch event, dofollow SEO backlinks, and an active community of makers.',
    whoForCompetitor: 'Pre-launch founders specifically collecting beta signups for a product not yet live.',
    table: {
      columnHeaders: ['Feature', 'Launch', 'BetaList'],
      rows: [
        { feature: 'Format', values: ['Format', 'Launch board (upvotes per day)', 'Pre-launch waitlist board'], winnerIndex: -1 },
        { feature: 'Dofollow backlinks', values: ['Dofollow backlinks', 'Yes', 'Yes'], winnerIndex: -1 },
        { feature: 'Free tier', values: ['Free tier', 'Yes (queued)', 'Yes (long queue)'], winnerIndex: 1 },
        { feature: 'Skip-the-queue price', values: ['Skip-the-queue price', '$39 (Pro one-off) / $99 (Pass unlimited)', '$129+'], winnerIndex: 1 },
        { feature: 'Cadence', values: ['Cadence', 'Daily', 'Continuous queue'], winnerIndex: -1 },
        { feature: 'Audience focus', values: ['Audience focus', 'AI tools + indie SaaS', 'Early-adopter consumers'], winnerIndex: -1 },
        { feature: 'Community', values: ['Community', 'Active Discourse forum', 'No forum'], winnerIndex: 1 },
        { feature: 'Best for', values: ['Best for', 'Launch day event', 'Pre-launch waitlist'], winnerIndex: -1 },
      ],
    },
    pricing: { launch: 'Free (queued), Pro $39 one-off (skip queue + same-day), Pass $99/year (unlimited launches).', competitor: 'Free with long queue. Paid placement starts around $129+ to skip the queue.' },
    verdict:
      'They are not really competitors — they are complements. If you are pre-launch and only need beta signups, BetaList is fit-for-purpose. If you are launched (or about to launch) and want an event with upvotes, backlinks, and ongoing community discovery, Launch is the better choice. Most founders use both, 2–4 weeks apart.',
    faqs: [
      { question: 'Is Launch a BetaList alternative?', answer: 'Yes, but for a slightly different job. Launch focuses on launch-day events and ongoing discovery; BetaList focuses on pre-launch waitlists.' },
      { question: 'Which one has dofollow backlinks?', answer: 'Both Launch and BetaList provide dofollow backlinks on listings.' },
      { question: 'Should I use both?', answer: 'Yes — BetaList in the weeks before launch to build a waitlist, then Launch on launch day for the upvote event and community discovery.' },
    ],
    related: [
      { label: 'BetaList alternatives in 2026', to: '/alternatives/betalist' },
      { label: 'Best product launch platforms', to: '/best/launch-platforms' },
      { label: 'Launch vs Peerlist', to: '/vs/launch-vs-peerlist' },
    ],
    ctaHeading: 'Launch your product on Launch',
    ctaBody: 'Dofollow links, fair ranking, active indie + AI community.',
    ctaPrimary: { label: 'Submit your product', to: '/submit' },
  },
  {
    kind: 'vs',
    slug: 'launch-vs-peerlist',
    competitor: 'Peerlist',
    title: 'Launch vs Peerlist — Honest Comparison',
    metaDescription:
      'Launch vs Peerlist for shipping products in 2026 — audience, ranking, and backlink value compared.',
    h1: 'Launch vs Peerlist',
    oneLiner: 'Launch is a launch board for AI tools and indie SaaS. Peerlist is a professional maker network with a launch feature.',
    intro: 'Both are loved by indie makers, but they serve different primary jobs.',
    summary:
      'Peerlist is a maker-focused professional network — your profile, your work, your reputation. Its Launchpad is a feature on top of that. Launch is a dedicated launch board with a daily leaderboard and a community forum. Pick Launch if you primarily want a launch event with backlinks; pick Peerlist if you want a long-term maker profile that compounds over time.',
    whoIsItFor: 'Indie makers comparing where to invest their launch energy and longer-term presence.',
    whoForLaunch: 'AI and indie SaaS founders who want a focused launch event with dofollow SEO and an active forum.',
    whoForCompetitor: 'Makers who want a long-term professional profile, project history, and peer feedback alongside launches.',
    table: {
      columnHeaders: ['Feature', 'Launch', 'Peerlist'],
      rows: [
        { feature: 'Primary purpose', values: ['Primary purpose', 'Launch board', 'Maker network + Launchpad'], winnerIndex: -1 },
        { feature: 'Dofollow backlinks', values: ['Dofollow backlinks', 'Yes', 'Yes'], winnerIndex: -1 },
        { feature: 'Free tier', values: ['Free tier', 'Yes', 'Yes'], winnerIndex: -1 },
        { feature: 'Same-day launch', values: ['Same-day launch', 'Yes (Pro)', 'Yes'], winnerIndex: -1 },
        { feature: 'Profile network effects', values: ['Profile network effects', 'Light', 'Heavy'], winnerIndex: 1 },
        { feature: 'Community forum', values: ['Community forum', 'Discourse forum', 'In-app discussions'], winnerIndex: -1 },
        { feature: 'Audience focus', values: ['Audience focus', 'AI tools + indie SaaS', 'Solo devs and makers'], winnerIndex: -1 },
      ],
    },
    pricing: { launch: 'Free, Pro $39 one-off, Pass $99/year unlimited.', competitor: 'Free with paid Pro features for profile and project enhancements.' },
    verdict:
      'If your only question is "where do I launch?", Launch is the more focused tool. If you want a long-term maker profile that ranks for your name and compounds over years, Peerlist is the better long-term investment. Most serious indie makers maintain both.',
    faqs: [
      { question: 'Is Launch better than Peerlist for launching?', answer: 'For a focused launch event with daily leaderboards and SEO backlinks, yes. For a long-term maker profile and peer feedback loop, Peerlist is stronger.' },
      { question: 'Are both Launch and Peerlist free?', answer: 'Yes. Launch has paid tiers ($39 Pro, $99 Pass) for queue-skip and unlimited launches. Peerlist has Pro features for profile enhancement.' },
      { question: 'Should I list on both?', answer: 'Yes — they are complementary, not competing.' },
    ],
    related: [
      { label: 'Best product launch platforms', to: '/best/launch-platforms' },
      { label: 'Launch vs BetaList', to: '/vs/launch-vs-betalist' },
      { label: 'Product Hunt alternatives', to: '/alternatives/product-hunt' },
    ],
    ctaHeading: 'Launch your product on Launch',
    ctaBody: 'Focused launch board, dofollow backlinks, free to submit.',
    ctaPrimary: { label: 'Submit your product', to: '/submit' },
  },
  {
    kind: 'vs',
    slug: 'launch-vs-microlaunch',
    competitor: 'MicroLaunch',
    title: 'Launch vs MicroLaunch (2026)',
    metaDescription:
      'Two indie launch platforms compared — pricing, ranking algorithm, audience size, dofollow backlinks.',
    h1: 'Launch vs MicroLaunch',
    oneLiner: 'Launch is a daily launch board with a forum and an AI/SaaS focus. MicroLaunch is a minimal launch board for side projects.',
    intro: 'Both are indie alternatives to Product Hunt, with different ambition levels.',
    summary:
      'MicroLaunch is intentionally minimal — submit, list, get a small bump. Launch goes further with a daily leaderboard, a community forum, an active maker scoring system, dofollow backlinks, free founder tools, and paid tiers for serious launches. If you are shipping a side project and want zero friction, MicroLaunch fits. If you want a launch event with real momentum and a long tail of community engagement, Launch is the larger surface area.',
    whoIsItFor: 'Indie founders comparing two indie launch boards before submitting.',
    whoForLaunch: 'AI + SaaS founders who want a launch event with backlinks, forum discussion, and ongoing leaderboard visibility.',
    whoForCompetitor: 'Side-project hobbyists who want a minimal, zero-friction listing.',
    table: {
      columnHeaders: ['Feature', 'Launch', 'MicroLaunch'],
      rows: [
        { feature: 'Daily leaderboard', values: ['Daily leaderboard', 'Yes', 'Yes'], winnerIndex: -1 },
        { feature: 'Dofollow backlinks', values: ['Dofollow backlinks', 'Yes', 'Yes'], winnerIndex: -1 },
        { feature: 'Free tier', values: ['Free tier', 'Yes (queued)', 'Yes'], winnerIndex: -1 },
        { feature: 'Community forum', values: ['Community forum', 'Active Discourse', 'No'], winnerIndex: 0 },
        { feature: 'Free founder tools', values: ['Free founder tools', '20+ tools', 'No'], winnerIndex: 0 },
        { feature: 'Maker scoring / karma', values: ['Maker scoring / karma', 'Yes', 'No'], winnerIndex: 0 },
        { feature: 'Audience focus', values: ['Audience focus', 'AI + indie SaaS', 'Side projects'], winnerIndex: -1 },
      ],
    },
    pricing: { launch: 'Free, Pro $39 one-off, Pass $99/year unlimited launches.', competitor: 'Free with optional paid upgrades.' },
    verdict:
      'Pick MicroLaunch if you want to ship a side project in 60 seconds. Pick Launch if you want a real launch event with backlinks, community discussion, free tools, and ongoing visibility past launch day.',
    faqs: [
      { question: 'Is Launch the same as MicroLaunch?', answer: 'No. They overlap as indie launch boards, but Launch is a larger platform with a community forum, free founder tools, maker scoring, and Pro/Pass tiers. MicroLaunch is intentionally minimal.' },
      { question: 'Which one has more traffic?', answer: 'Both are smaller than Product Hunt; Launch generally has a wider surface area thanks to its programmatic SEO pages, forum, and ongoing leaderboards.' },
      { question: 'Can I list on both?', answer: 'Yes, listings are not exclusive.' },
    ],
    related: [
      { label: 'Best product launch platforms', to: '/best/launch-platforms' },
      { label: 'Product Hunt alternatives in 2026', to: '/alternatives/product-hunt' },
      { label: 'Best places to launch a SaaS', to: '/best/places-to-launch-saas' },
    ],
    ctaHeading: 'Launch your product on Launch',
    ctaBody: 'Real launch event, dofollow backlinks, active community. Free to start.',
    ctaPrimary: { label: 'Submit your product', to: '/submit' },
  },
];

export const vsPagesBySlug = Object.fromEntries(vsPages.map((p) => [p.slug, p]));
