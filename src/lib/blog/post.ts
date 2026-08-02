// Shared blog post types + derivation helpers.
// IMPORTANT: everything here is derived from the EXISTING blog_posts columns
// (title, excerpt, content_md, tags, view_count, published_at, updated_at).
// No schema change is required — new columns are read optionally if present.

import { CATEGORIES, type BlogCategory } from './taxonomy';
import { AUTHORS, DEFAULT_AUTHOR, type BlogAuthor } from './authors';

export interface BlogPostRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md?: string | null;
  cover_image_url: string | null;
  card_image_url?: string | null;
  og_image_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  tags: string[] | null;
  view_count?: number | null;
  published_at: string | null;
  updated_at?: string | null;
  // Optional / future columns — safely undefined until the migration runs.
  category?: string | null;
  author_slug?: string | null;
  featured?: boolean | null;
  read_minutes?: number | null;
}

const WORDS_PER_MINUTE = 220;

/** Branded fallback used when an article has no generated artwork yet. */
export const BLOG_PLACEHOLDER_IMAGE = '/social-card.png';

/** Full-width hero / article header image. */
export const heroImage = (post: BlogPostRecord): string =>
  post.cover_image_url || post.card_image_url || BLOG_PLACEHOLDER_IMAGE;

/** Smaller rendition for homepage, category, search and related cards. */
export const cardImage = (post: BlogPostRecord): string =>
  post.card_image_url || post.cover_image_url || BLOG_PLACEHOLDER_IMAGE;

/** 1200x630 social preview (X, LinkedIn, Facebook, Discord). */
export const ogImage = (post: BlogPostRecord): string =>
  post.og_image_url || post.cover_image_url || 'https://trylaunch.ai/social-card.png';

export const readTime = (post: BlogPostRecord): number => {
  if (post.read_minutes && post.read_minutes > 0) return post.read_minutes;
  const words = (post.content_md || post.excerpt || '').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / WORDS_PER_MINUTE) || 5);
};

/** Best-effort categorisation from an explicit column, tags, then title keywords. */
export const categoryOf = (post: BlogPostRecord): BlogCategory => {
  if (post.category) {
    const direct = CATEGORIES.find(
      (c) => c.slug === post.category || c.name.toLowerCase() === String(post.category).toLowerCase(),
    );
    if (direct) return direct;
  }
  const haystack = [
    ...(post.tags || []),
    post.title,
    post.excerpt || '',
  ]
    .join(' ')
    .toLowerCase();

  let best: { cat: BlogCategory; score: number } | null = null;
  for (const cat of CATEGORIES) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (haystack.includes(kw)) score += kw.split(' ').length;
    }
    if (score > 0 && (!best || score > best.score)) best = { cat, score };
  }
  return best?.cat ?? CATEGORIES[0];
};

export const authorOf = (post: BlogPostRecord): BlogAuthor => {
  if (post.author_slug) {
    const found = AUTHORS.find((a) => a.slug === post.author_slug);
    if (found) return found;
  }
  // Deterministic assignment keeps author pages stable and auto-includes new posts.
  const cat = categoryOf(post);
  return AUTHORS.find((a) => a.categories.includes(cat.slug)) ?? DEFAULT_AUTHOR;
};

export const isUpdated = (post: BlogPostRecord): boolean => {
  if (!post.published_at || !post.updated_at) return false;
  const diff = new Date(post.updated_at).getTime() - new Date(post.published_at).getTime();
  return diff > 1000 * 60 * 60 * 24 * 3; // updated 3+ days after publishing
};

/** Sort helper: trending = recent posts weighted by views. */
export const trendingScore = (post: BlogPostRecord): number => {
  const views = post.view_count || 0;
  const ageDays = post.published_at
    ? (Date.now() - new Date(post.published_at).getTime()) / 86_400_000
    : 999;
  return (views + 5) / Math.pow(ageDays + 2, 1.2);
};

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export const slugifyHeading = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const extractHeadings = (md: string): Heading[] => {
  const out: Heading[] = [];
  for (const line of md.split('\n')) {
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, '').trim();
    out.push({ id: slugifyHeading(text), text, level: m[1].length === 2 ? 2 : 3 });
  }
  return out;
};

/** Pull an FAQ pair list out of the article body (### question + answer). */
export const extractFaqs = (md: string): { question: string; answer: string }[] => {
  const faqs: { question: string; answer: string }[] = [];
  const lines = md.split('\n');
  let inFaq = false;
  let current: { question: string; answer: string } | null = null;
  for (const line of lines) {
    const h2 = /^##\s+(.+)/.exec(line);
    if (h2) {
      if (current) { faqs.push(current); current = null; }
      inFaq = /faq|frequently asked|common questions/i.test(h2[1]);
      continue;
    }
    if (!inFaq) continue;
    const h3 = /^###\s+(.+)/.exec(line);
    if (h3) {
      if (current) faqs.push(current);
      current = { question: h3[1].replace(/[*_`]/g, '').trim(), answer: '' };
      continue;
    }
    if (current && line.trim()) {
      current.answer = `${current.answer} ${line.trim()}`.trim();
    }
  }
  if (current) faqs.push(current);
  return faqs.filter((f) => f.answer.length > 20).slice(0, 6);
};

/** First substantive paragraph — used as the TL;DR / direct answer for AI search. */
export const extractTldr = (post: BlogPostRecord): string => {
  if (post.excerpt && post.excerpt.length > 80) return post.excerpt;
  const md = post.content_md || '';
  for (const block of md.split('\n\n')) {
    const clean = block.trim();
    if (!clean || clean.startsWith('#') || clean.startsWith('-') || clean.startsWith('*')) continue;
    return clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`>]/g, '').slice(0, 320);
  }
  return post.excerpt || '';
};

/** Key takeaways: the first strong bullet list in the article. */
export const extractKeyTakeaways = (md: string): string[] => {
  const bullets: string[] = [];
  for (const line of md.split('\n')) {
    const m = /^\s*[-*]\s+(.+)/.exec(line);
    if (m) {
      bullets.push(m[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim());
      if (bullets.length >= 5) break;
    } else if (bullets.length > 0 && line.trim() === '') {
      if (bullets.length >= 3) break;
    }
  }
  return bullets.length >= 3 ? bullets.slice(0, 5) : [];
};

/** Related posts: same category first, then most recent. Always auto-includes new posts. */
export const relatedPosts = (
  post: BlogPostRecord,
  all: BlogPostRecord[],
  limit = 3,
): BlogPostRecord[] => {
  const cat = categoryOf(post).slug;
  const tags = new Set((post.tags || []).map((t) => t.toLowerCase()));
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => {
      let score = 0;
      if (categoryOf(p).slug === cat) score += 3;
      for (const t of p.tags || []) if (tags.has(t.toLowerCase())) score += 2;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score ||
      new Date(b.p.published_at || 0).getTime() - new Date(a.p.published_at || 0).getTime())
    .slice(0, limit)
    .map((x) => x.p);
};
