import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isCronAuthorized, unauthorizedResponse } from '../_shared/cron-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TYPEFULLY_API_URL = 'https://api.typefully.com/v2';

function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^@+/, '').replace(/\s+/g, '');
  if (!trimmed) return null;
  // strip URL prefixes like twitter.com/, x.com/
  const m = trimmed.match(/(?:twitter\.com\/|x\.com\/)?([A-Za-z0-9_]{1,15})/);
  return m ? m[1] : null;
}

function truncateToOneSentence(text: string): string {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
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
    platforms: {
      x: {
        enabled: true,
        posts: [{ text }],
      },
    },
    // Auto-publish immediately — these are time-sensitive launch announcements
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
    return new Response(null, { headers: corsHeaders }

  if (!isCronAuthorized(req)) {
    return unauthorizedResponse(corsHeaders);
  }
);
  }

  try {
    const typefullyApiKey = Deno.env.get('TYPEFULLY_API_KEY');
    if (!typefullyApiKey) throw new Error('TYPEFULLY_API_KEY is not configured');

    const { productId } = await req.json().catch(() => ({}));
    if (!productId || typeof productId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'productId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch product
    const { data: product, error: productErr } = await supabase
      .from('products')
      .select('id, name, slug, tagline, status, owner_id, twitter_handle')
      .eq('id', productId)
      .maybeSingle();

    if (productErr) throw productErr;
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (product.status !== 'launched') {
      return new Response(
        JSON.stringify({ message: 'Product not launched, skipping', status: product.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    console.log(`Posting launch tweet for ${product.id} (handle=${handle ?? 'none'}):\n${text}`);

    const socialSetId = await getSocialSetId(typefullyApiKey);
    const draft = await createTypefullyDraft(typefullyApiKey, socialSetId, text);

    return new Response(
      JSON.stringify({ success: true, draft_id: draft.id, handle, text_length: text.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('post-launch-tweet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
