// Generates FAQ JSON-LD entries and intro copy fallbacks for programmatic SEO pages.

interface FaqItem {
  question: string;
  answer: string;
}

export function buildFaqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

export function buildItemListJsonLd(
  name: string,
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.slice(0, 20).map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function tagFaqs(tagName: string, count: number): FaqItem[] {
  const lower = tagName.toLowerCase();
  return [
    {
      question: `What are the best ${lower} tools in 2026?`,
      answer: `Launch tracks ${count} ${lower} products voted on by makers and indie founders. The leaderboard ranks by community upvotes, recency, and verified revenue.`,
    },
    {
      question: `How are ${lower} products ranked?`,
      answer: `Products are ranked daily by upvotes from verified makers. New launches receive a 24-hour window of homepage visibility, then move into the permanent ${tagName} archive.`,
    },
    {
      question: `Can I submit a ${lower} product?`,
      answer: `Yes — any maker can submit a product for free. Free launches enter the queue (~7 days), while Pro ($39) and Pass ($99/yr) launches publish immediately.`,
    },
  ];
}

export function categoryFaqs(categoryName: string, count: number): FaqItem[] {
  const lower = categoryName.toLowerCase();
  return [
    {
      question: `What is the best ${lower} app?`,
      answer: `The top-rated ${lower} apps on Launch are ranked by community upvotes from ${count}+ products. The leaderboard updates daily based on maker votes and traction.`,
    },
    {
      question: `How do I find new ${lower} products?`,
      answer: `Sort by "Latest" to see the newest ${lower} launches, or "Popular" for the most upvoted. Filter by week or month to discover trending ${categoryName} tools.`,
    },
    {
      question: `Are these ${lower} tools free?`,
      answer: `Most ${lower} products on Launch offer free trials or freemium tiers. Click any listing to visit the maker's site and see current pricing.`,
    },
  ];
}

export function techFaqs(techName: string, count: number): FaqItem[] {
  return [
    {
      question: `What products are built with ${techName}?`,
      answer: `Launch tracks ${count} live products built with ${techName}, including SaaS tools, AI apps, and developer utilities — all submitted and verified by their makers.`,
    },
    {
      question: `Why use ${techName} for a startup?`,
      answer: `${techName} is popular among indie makers and YC-style founders for its developer experience and shipping velocity. Browse the products below to see what teams have built with it.`,
    },
    {
      question: `Where can I see ${techName} alternatives?`,
      answer: `Visit /tech to browse the full Builder Stack leaderboard and discover trending technologies used by the top-launched products on Launch.`,
    },
  ];
}

export function tagIntroFallback(tagName: string, count: number): string {
  const lower = tagName.toLowerCase();
  return `Browse ${count} ${lower} products launched by indie makers and founders. Each product is upvoted by the Launch community — a focused alternative to Product Hunt for serious builders. Sort by popularity, recency, or verified revenue to find the right ${lower} tool for your stack.`;
}

export function categoryIntroFallback(categoryName: string, count: number): string {
  const lower = categoryName.toLowerCase();
  return `Discover ${count} ${lower} apps and tools built by independent makers. Launch is the no-noise launchpad where ${categoryName} products get real upvotes, real feedback, and real traffic from a focused community of builders.`;
}

export function techIntroFallback(techName: string, count: number): string {
  return `${count} live products built with ${techName}, submitted by their makers. ${techName} powers everything from solo-dev SaaS to AI startups — explore the full collection and see what other founders are shipping.`;
}
