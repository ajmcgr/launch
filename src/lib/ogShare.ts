// Per-product social sharing cards.
//
// The site is a static SPA, so social crawlers never execute the React
// <Helmet> tags on /launch/:slug — they only see the default card in
// index.html. The `og-share` edge function renders per-product OG tags
// (first screenshot as the image) for bots and 302s humans to the real page.
//
// IMPORTANT: never put the raw edge-function URL into anything a human sees.
// It exposes the Supabase project host (…supabase.co/functions/v1/og-share…),
// which looks broken/untrustworthy in a tweet or LinkedIn post. Every
// user-facing share link must be the clean trylaunch.ai URL.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

export const SITE_URL = 'https://trylaunch.ai';

/** Clean, user-facing product URL. Use this for ALL share links. */
export function getProductUrl(slug: string): string {
  return `${SITE_URL}/launch/${slug}`;
}

/**
 * Crawler-facing endpoint that serves a product-specific OG card.
 * Internal/debug use only (e.g. pasting into the X or LinkedIn post
 * inspector to refresh a cached preview). Do NOT use in share buttons.
 */
export function getCrawlerCardUrl(slug: string): string {
  if (!SUPABASE_URL) return getProductUrl(slug);
  return `${SUPABASE_URL}/functions/v1/og-share?slug=${encodeURIComponent(slug)}`;
}
