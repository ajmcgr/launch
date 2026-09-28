/**
 * Cloudflare Worker: canonical routing and crawler-visible metadata for Launch.
 *
 * Deploy on `trylaunch.ai/*` and `www.trylaunch.ai/*` with SUPABASE_URL set to
 * the Launch project URL. Humans continue to receive the SPA; major crawlers
 * receive small server-rendered documents from `seo-page`.
 */

const BOT_UA =
  /(twitterbot|facebookexternalhit|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|embedly|quora link preview|showyoubot|outbrain|vkshare|w3c_validator|skypeuripreview|bingbot|googlebot|applebot|bluesky|mastodon|iframely)/i;

const APEX_HOST = 'trylaunch.ai';

const redirect = (url, path, status) => {
  const destination = new URL(url);
  destination.hostname = APEX_HOST;
  destination.protocol = 'https:';
  destination.pathname = path;
  return Response.redirect(destination.toString(), status);
};

const seoRequest = async (env, path, mode) => {
  const supabaseUrl = (env.SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseUrl) return null;
  const target = `${supabaseUrl}/functions/v1/seo-page?mode=${encodeURIComponent(mode)}&path=${encodeURIComponent(path)}`;
  try {
    return await fetch(target, {
      headers: { accept: mode === 'page' ? 'text/html' : 'application/json' },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
  } catch (_) {
    return null;
  }
};

const isCanonicalSlashPath = (pathname) =>
  /^\/(?:launch|category|tag|collections|tech|blog|vibe-coding|tools|compare|best|vs|alternatives|launches)\/[^/]+\/$/.test(pathname)
  || pathname === '/makers/'
  || pathname === '/leaderboard/'
  || /^\/c\/[^/]+\/$/.test(pathname);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const ua = request.headers.get('user-agent') || '';

    if (url.hostname === `www.${APEX_HOST}`) return redirect(url, url.pathname, 301);

    if (url.pathname === '/makers' || url.pathname === '/makers/') return redirect(url, '/vibecoders', 301);
    if (url.pathname === '/leaderboard' || url.pathname === '/leaderboard/') return redirect(url, '/vibecoders', 301);
    const legacyCollection = url.pathname.match(/^\/c\/([^/]+)\/?$/);
    if (legacyCollection) return redirect(url, `/collections/${legacyCollection[1]}`, 301);
    if (isCanonicalSlashPath(url.pathname)) return redirect(url, url.pathname.slice(0, -1), 308);

    // Resolve product URLs for every browser and crawler request. This protects
    // backlinks when a slug changes and prevents fake product URLs returning 200.
    const productMatch = url.pathname.match(/^\/launch\/([^/]+)$/);
    if (productMatch && (method === 'GET' || method === 'HEAD')) {
      const resolved = await seoRequest(env, url.pathname, 'resolve');
      if (!resolved) return new Response('Service unavailable', { status: 503 });
      if (resolved.status === 404) return new Response('Not found', { status: 404 });
      const result = await resolved.json();
      if (result.state === 'redirect' && result.canonicalPath) {
        return redirect(url, result.canonicalPath, 301);
      }
    }

    if (!BOT_UA.test(ua) || method !== 'GET') return fetch(request);

    const metadata = await seoRequest(env, url.pathname, 'page');
    if (metadata?.status === 404 && productMatch) return new Response('Not found', { status: 404 });
    if (metadata?.ok) {
      const headers = new Headers(metadata.headers);
      headers.set('content-type', 'text/html; charset=utf-8');
      headers.set('cache-control', 'public, max-age=300');
      return new Response(metadata.body, { status: 200, headers });
    }

    return fetch(request);
  },
};
