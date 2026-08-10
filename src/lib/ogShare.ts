// Per-product social sharing cards.
//
// The site is a static SPA, so social crawlers never execute the React
// <Helmet> tags on /launch/:slug — they only see the default card in
// index.html. The `og-share` edge function renders per-product OG tags
// (first screenshot as the image) for bots and 302s humans to the real page.
//
// Use `getProductShareUrl` for platforms that fetch metadata from a URL
// parameter (LinkedIn, Reddit, Facebook). Use `getProductUrl` for anything
// the user sees or copies.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

export const SITE_URL = 'https://trylaunch.ai';

/** Clean, user-facing product URL. */
export function getProductUrl(slug: string): string {
  return `${SITE_URL}/launch/${slug}`;
}

/**
 * Crawler-facing URL that serves a product-specific OG card
 * (first screenshot) and redirects humans to the clean product URL.
 */
export function getProductShareUrl(slug: string): string {
  if (!SUPABASE_URL) return getProductUrl(slug);
  return `${SUPABASE_URL}/functions/v1/og-share?slug=${encodeURIComponent(slug)}`;
}
