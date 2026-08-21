/**
 * Cloudflare Worker: serve per-product Open Graph cards on trylaunch.ai.
 *
 * WHY: the site is a static SPA. Social crawlers (X, LinkedIn, Slack, Discord,
 * Facebook) do not run JavaScript, so on https://trylaunch.ai/launch/:slug they
 * only ever read the generic card baked into index.html. The `og-share` Supabase
 * edge function already renders the correct per-product tags (first screenshot as
 * the image) — this Worker routes ONLY bot requests to it, so humans keep the
 * clean branded URL and bots get the product card.
 *
 * DEPLOY (trylaunch.ai must be on Cloudflare DNS, proxied/orange-cloud):
 *   1. Cloudflare dashboard → Workers & Pages → Create → Worker.
 *   2. Paste this file, deploy.
 *   3. Worker → Settings → Domains & Routes → Add route:
 *        trylaunch.ai/launch/*        (zone: trylaunch.ai)
 *      Add a second route for www if you serve it: www.trylaunch.ai/launch/*
 *   4. Set the SUPABASE_URL variable (Settings → Variables) to
 *        https://<your-project-ref>.supabase.co
 *
 * VERIFY:
 *   curl -A "Twitterbot" https://trylaunch.ai/launch/<slug> | grep og:image
 *   -> should show the product screenshot, not social-card.png
 *   Then re-scrape the URL in the X Post Inspector / LinkedIn Post Inspector.
 */

const BOT_UA =
  /(twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|embedly|quora link preview|showyoubot|outbrain|vkshare|w3c_validator|skypeuripreview|bingbot|googlebot|applebot|bluesky|mastodon|iframely)/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ua = request.headers.get('user-agent') || '';

    const isBot = BOT_UA.test(ua);
    const match = url.pathname.match(/^\/launch\/([^/]+)\/?$/);

    // Humans, non-product paths, non-GET: pass straight through to the SPA.
    if (!isBot || !match || request.method !== 'GET') {
      return fetch(request);
    }

    const slug = decodeURIComponent(match[1]);
    const supabaseUrl = (env.SUPABASE_URL || '').replace(/\/$/, '');
    if (!supabaseUrl) return fetch(request);

    const target = `${supabaseUrl}/functions/v1/og-share?slug=${encodeURIComponent(slug)}`;

    try {
      const res = await fetch(target, {
        headers: { 'user-agent': ua, accept: 'text/html' },
        // og-share 302s humans; for bots we want the rendered HTML, and the
        // function returns HTML directly when it detects a crawler UA.
        redirect: 'manual',
        cf: { cacheTtl: 300, cacheEverything: true },
      });

      if (res.status >= 200 && res.status < 300) {
        const headers = new Headers(res.headers);
        headers.set('content-type', 'text/html; charset=utf-8');
        headers.set('cache-control', 'public, max-age=300');
        return new Response(res.body, { status: 200, headers });
      }
    } catch (_) {
      // fall through to the SPA on any failure
    }

    return fetch(request);
  },
};
