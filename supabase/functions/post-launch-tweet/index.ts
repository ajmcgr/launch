import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- inlined from _shared/cron-auth.ts (kept inline so manual dashboard deploys work) ---
function isCronAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const cronSecretHeader = req.headers.get('x-cron-secret') || req.headers.get('X-Cron-Secret') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const expectedCronSecret = Deno.env.get('CRON_SECRET') || '';
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) return true;
  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) return true;
  return false;
}

function unauthorizedResponse(headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TYPEFULLY_API_URL = 'https://api.typefully.com/v2';
const X_API_URL = 'https://api.x.com/2';
const TWEET_EVENT = 'launch_tweet_posted';

function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^@+/, '').replace(/\s+/g, '');
  if (!trimmed) return null;
  const m = trimmed.match(/(?:twitter\.com\/|x\.com\/)?([A-Za-z0-9_]{1,15})/);
  return m ? m[1] : null;
}

function truncateToOneSentence(text: string): string {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
}

// ---------- OAuth 1.0a (HMAC-SHA1) signing for X API v2 ----------
function pctEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function oauth1Header(
  method: string,
  url: string,
  creds: {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  },
): Promise<string> {
  // NOTE: JSON body params are NOT part of the OAuth signature base string.
  const params: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(params[k])}`)
    .join('&');

  const baseString = [method.toUpperCase(), pctEncode(url), pctEncode(paramString)].join('&');
  const signingKey = `${pctEncode(creds.consumerSecret)}&${pctEncode(creds.accessTokenSecret)}`;
  const signature = await hmacSha1Base64(signingKey, baseString);

  const headerParams: Record<string, string> = { ...params, oauth_signature: signature };
  return (
    'OAuth ' +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${pctEncode(k)}="${pctEncode(headerParams[k])}"`)
      .join(', ')
  );
}

function xCreds() {
  const consumerKey = Deno.env.get('TWITTER_CONSUMER_KEY');
  const consumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET');
  const accessToken = Deno.env.get('TWITTER_ACCESS_TOKEN');
  const accessTokenSecret = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET');
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) return null;
  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

// Upload an image (product screenshot) to X so the tweet shows it instead of
// the site-wide OG social card.
async function uploadMediaToX(imageUrl: string): Promise<string | null> {
  const creds = xCreds();
  if (!creds) return null;

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error(`Failed to fetch screenshot ${imageUrl}: ${imgRes.status}`);
      return null;
    }
    const contentType = imgRes.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) {
      console.error(`Screenshot is not an image (${contentType}), skipping media upload`);
      return null;
    }
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    // X image limit is 5MB
    if (bytes.byteLength > 5 * 1024 * 1024) {
      console.error(`Screenshot too large (${bytes.byteLength} bytes), skipping media upload`);
      return null;
    }

    const uploadUrl = 'https://upload.x.com/1.1/media/upload.json';
    // multipart bodies are not part of the OAuth 1.0a signature base string
    const authHeader = await oauth1Header('POST', uploadUrl, creds);

    const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
    const form = new FormData();
    form.append('media', new Blob([bytes], { type: contentType }), `screenshot.${ext}`);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form,
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`X media upload failed [${res.status}]: ${body}`);
      return null;
    }
    const parsed = JSON.parse(body);
    return parsed.media_id_string ?? null;
  } catch (err) {
    console.error('X media upload error:', err);
    return null;
  }
}

async function postToX(text: string, mediaIds: string[] = []) {
  const creds = xCreds();
  if (!creds) return null;

  const url = `${X_API_URL}/tweets`;
  const authHeader = await oauth1Header('POST', url, creds);

  const payload: Record<string, unknown> = { text };
  if (mediaIds.length > 0) payload.media = { media_ids: mediaIds };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`X API error [${res.status}]: ${body}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return { raw: body };
  }
}


async function getSocialSetId(apiKey: string): Promise<string> {
  const res = await fetch(`${TYPEFULLY_API_URL}/social-sets`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch social sets: ${res.status}`);
  const data = await res.json();
  const sets = data.results || data;
  if (!sets || sets.length === 0) throw new Error('No social sets found in Typefully');
  return sets[0].id;
}

async function createTypefullyDraft(apiKey: string, socialSetId: string, text: string) {
  const body = {
    platforms: { x: { enabled: true, posts: [{ text }] } },
    'schedule-date': 'next-free-slot',
    'auto_retweet_enabled': false,
  };

  const res = await fetch(`${TYPEFULLY_API_URL}/social-sets/${socialSetId}/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Typefully API error [${res.status}]: ${errorBody}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isCronAuthorized(req)) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const { productId, force } = await req.json().catch(() => ({}));
    if (!productId || typeof productId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'productId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: product, error: productErr } = await supabase
      .from('products')
      .select('id, name, slug, tagline, status, owner_id, twitter_handle')
      .eq('id', productId)
      .maybeSingle();

    if (productErr) throw productErr;
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (product.status !== 'launched') {
      return new Response(
        JSON.stringify({ message: 'Product not launched, skipping', status: product.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Dedupe: never tweet the same product twice
    if (!force) {
      const { data: alreadyPosted } = await supabase
        .from('product_analytics')
        .select('id')
        .eq('product_id', product.id)
        .eq('event_type', TWEET_EVENT)
        .limit(1)
        .maybeSingle();

      if (alreadyPosted) {
        return new Response(
          JSON.stringify({ message: 'Already tweeted, skipping', productId: product.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Resolve handle: per-product override → owner profile twitter
    let handle = normalizeHandle(product.twitter_handle);
    if (!handle && product.owner_id) {
      const { data: owner } = await supabase
        .from('users')
        .select('twitter')
        .eq('id', product.owner_id)
        .maybeSingle();
      handle = normalizeHandle(owner?.twitter ?? null);
    }

    const productUrl = `https://trylaunch.ai/launch/${product.slug}`;
    const tagline = product.tagline ? truncateToOneSentence(product.tagline) : '';
    const mentionLine = handle ? `\n\nBuilt by @${handle}` : '';

    const text =
      `🚀 ${product.name} just launched on Launch!` +
      (tagline ? `\n\n${tagline}` : '') +
      mentionLine +
      `\n\n${productUrl}`;

    // Attach the product's own screenshot (fallback: thumbnail, then icon) so
    // the tweet shows the app image instead of the default Launch social card.
    const { data: media } = await supabase
      .from('product_media')
      .select('type, url')
      .eq('product_id', product.id);

    const pickMedia = (type: string) =>
      media?.find((m: { type: string; url: string }) => m.type === type && m.url)?.url ?? null;
    const imageUrl = pickMedia('screenshot') || pickMedia('thumbnail') || pickMedia('icon');

    console.log(`Posting launch tweet for ${product.id} (handle=${handle ?? 'none'}, image=${imageUrl ?? 'none'}):\n${text}`);

    let via = 'x';
    let result: unknown = null;
    let mediaId: string | null = null;

    try {
      if (imageUrl) {
        mediaId = await uploadMediaToX(imageUrl);
      }
      result = await postToX(text, mediaId ? [mediaId] : []);
      if (result === null) {
        // X credentials missing — fall back to Typefully
        via = 'typefully';
      }
    } catch (xError) {
      console.error('Direct X post failed, falling back to Typefully:', xError);
      via = 'typefully';
    }



    if (via === 'typefully') {
      const typefullyApiKey = Deno.env.get('TYPEFULLY_API_KEY');
      if (!typefullyApiKey) {
        throw new Error('X credentials failed and TYPEFULLY_API_KEY is not configured');
      }
      const socialSetId = await getSocialSetId(typefullyApiKey);
      result = await createTypefullyDraft(typefullyApiKey, socialSetId, text);
    }

    // Record so we never double-post
    const { error: logError } = await supabase
      .from('product_analytics')
      .insert({ product_id: product.id, event_type: TWEET_EVENT, visitor_id: null });
    if (logError) console.error('Failed to log launch tweet event:', logError);

    return new Response(
      JSON.stringify({ success: true, via, result, handle, text_length: text.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('post-launch-tweet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
