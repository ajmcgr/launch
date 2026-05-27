// Founder Milestone System — config: titles, share text, icons, thresholds.

export type AchievementType =
  | 'trending_1'
  | 'trending_top_10'
  | 'homepage_trending'
  | 'featured'
  | 'most_saved'
  | 'fastest_rising'
  | 'popular_week'
  | 'collections_100'
  | 'clicks_100'
  | 'clicks_500'
  | 'clicks_1000'
  | 'clicks_5000'
  | 'impressions_10000';

export interface MilestoneMeta {
  type: AchievementType;
  title: string;
  emoji: string;
  /** Short metric label e.g. "1,000+ clicks" — uses formatter when value provided */
  metricLabel: (value?: number) => string;
  emailSubject: string;
  shareText: (productName: string, url: string) => string;
  /** Visual accent: tailwind color class for badge/icon */
  accent: string;
  category: 'trending' | 'traffic' | 'social' | 'editorial';
}

const fmt = (n: number) => n.toLocaleString();

export const MILESTONES: Record<AchievementType, MilestoneMeta> = {
  trending_1: {
    type: 'trending_1',
    title: '#1 Trending',
    emoji: '🥇',
    metricLabel: () => '#1 today',
    emailSubject: '🥇 You hit #1 Trending on Launch',
    shareText: (p, url) => `We just hit #1 Trending on Launch 🚀\n\nThanks to everyone who supported ${p}.\n\n${url}`,
    accent: 'text-yellow-500',
    category: 'trending',
  },
  trending_top_10: {
    type: 'trending_top_10',
    title: 'Top 10 Trending',
    emoji: '🔥',
    metricLabel: () => 'Top 10 today',
    emailSubject: '🔥 You broke into the Top 10 on Launch',
    shareText: (p, url) => `${p} is trending on Launch today — in the Top 10 🔥\n\n${url}`,
    accent: 'text-orange-500',
    category: 'trending',
  },
  homepage_trending: {
    type: 'homepage_trending',
    title: 'Reached Homepage Trending',
    emoji: '🏠',
    metricLabel: () => 'Featured on homepage',
    emailSubject: '📈 Your product is on the Launch homepage',
    shareText: (p, url) => `${p} just hit the Launch homepage 📈\n\n${url}`,
    accent: 'text-blue-500',
    category: 'trending',
  },
  featured: {
    type: 'featured',
    title: 'Featured Product',
    emoji: '⭐',
    metricLabel: () => 'Editor pick',
    emailSubject: '⭐ Your product was Featured on Launch',
    shareText: (p, url) => `${p} was just featured on Launch ⭐\n\n${url}`,
    accent: 'text-purple-500',
    category: 'editorial',
  },
  most_saved: {
    type: 'most_saved',
    title: 'Most Saved Product',
    emoji: '🔖',
    metricLabel: () => 'Most saved this week',
    emailSubject: '🔥 You\'re one of the Most Saved Products this week',
    shareText: (p, url) => `${p} is one of the most-saved products on Launch this week 🔖\n\n${url}`,
    accent: 'text-pink-500',
    category: 'social',
  },
  fastest_rising: {
    type: 'fastest_rising',
    title: 'Fastest Rising Product',
    emoji: '🚀',
    metricLabel: () => 'Fastest rising today',
    emailSubject: '🚀 You\'re the Fastest Rising product on Launch',
    shareText: (p, url) => `${p} is the fastest rising product on Launch right now 🚀\n\n${url}`,
    accent: 'text-emerald-500',
    category: 'trending',
  },
  popular_week: {
    type: 'popular_week',
    title: 'Popular This Week',
    emoji: '📈',
    metricLabel: () => 'Popular this week',
    emailSubject: '📈 Your product is Popular This Week on Launch',
    shareText: (p, url) => `${p} is one of the most popular products on Launch this week 📈\n\n${url}`,
    accent: 'text-indigo-500',
    category: 'trending',
  },
  collections_100: {
    type: 'collections_100',
    title: 'Added to 100 Collections',
    emoji: '📚',
    metricLabel: (v) => `${fmt(v ?? 100)}+ collections`,
    emailSubject: '📚 Your product was added to 100+ collections',
    shareText: (p, url) => `${p} has been added to 100+ collections on Launch 📚\n\n${url}`,
    accent: 'text-cyan-500',
    category: 'social',
  },
  clicks_100: {
    type: 'clicks_100',
    title: '100 Clicks',
    emoji: '👆',
    metricLabel: (v) => `${fmt(v ?? 100)}+ clicks`,
    emailSubject: '🎉 Your product just hit 100 clicks on Launch',
    shareText: (p, url) => `Launch sent ${p} its first 100 visitors 👆\n\n${url}`,
    accent: 'text-sky-500',
    category: 'traffic',
  },
  clicks_500: {
    type: 'clicks_500',
    title: '500 Clicks',
    emoji: '⚡',
    metricLabel: (v) => `${fmt(v ?? 500)}+ clicks`,
    emailSubject: '⚡ 500 visitors and counting',
    shareText: (p, url) => `Launch has sent ${p} 500+ visitors ⚡\n\n${url}`,
    accent: 'text-sky-600',
    category: 'traffic',
  },
  clicks_1000: {
    type: 'clicks_1000',
    title: '1,000 Clicks',
    emoji: '🚀',
    metricLabel: (v) => `${fmt(v ?? 1000)}+ clicks`,
    emailSubject: '🚀 Your product just hit 1,000 clicks on Launch',
    shareText: (p, url) => `Launch sent ${p} 1,000+ visitors 🚀\n\n${url}`,
    accent: 'text-primary',
    category: 'traffic',
  },
  clicks_5000: {
    type: 'clicks_5000',
    title: '5,000 Clicks',
    emoji: '💥',
    metricLabel: (v) => `${fmt(v ?? 5000)}+ clicks`,
    emailSubject: '💥 5,000 clicks from Launch',
    shareText: (p, url) => `Launch has driven 5,000+ visitors to ${p} 💥\n\n${url}`,
    accent: 'text-red-500',
    category: 'traffic',
  },
  impressions_10000: {
    type: 'impressions_10000',
    title: '10,000 Impressions',
    emoji: '👀',
    metricLabel: (v) => `${fmt(v ?? 10000)}+ impressions`,
    emailSubject: '👀 Your product hit 10,000 impressions',
    shareText: (p, url) => `${p} just crossed 10,000 impressions on Launch 👀\n\n${url}`,
    accent: 'text-amber-500',
    category: 'traffic',
  },
};

export const ALL_MILESTONES: MilestoneMeta[] = Object.values(MILESTONES);

export const CLICK_TIERS: Array<{ type: AchievementType; threshold: number }> = [
  { type: 'clicks_100', threshold: 100 },
  { type: 'clicks_500', threshold: 500 },
  { type: 'clicks_1000', threshold: 1000 },
  { type: 'clicks_5000', threshold: 5000 },
];

export function getMilestone(type: string): MilestoneMeta | null {
  return (MILESTONES as Record<string, MilestoneMeta>)[type] ?? null;
}
