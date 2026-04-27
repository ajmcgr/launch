import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateHmac(data: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Sync a user to Discourse via the sync_sso admin endpoint.
 * This creates/updates the user account so we can post on their behalf.
 * Returns the Discourse username on success, or null on failure.
 */
async function syncUserToDiscourse(
  discourseUrl: string,
  discourseApiKey: string,
  ssoSecret: string,
  user: { id: string; email: string; username: string; name?: string; avatar_url?: string }
): Promise<string | null> {
  try {
    const ssoParams = new URLSearchParams({
      external_id: user.id,
      email: user.email,
      username: user.username,
      name: user.name || user.username,
      ...(user.avatar_url ? { avatar_url: user.avatar_url } : {}),
    });

    const ssoPayload = btoa(ssoParams.toString());
    const sig = generateHmac(ssoPayload, ssoSecret);

    const response = await fetch(`${discourseUrl}/admin/users/sync_sso`, {
      method: 'POST',
      headers: {
        'Api-Key': discourseApiKey,
        'Api-Username': 'system',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sso: ssoPayload, sig }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to sync user to Discourse [${response.status}]:`, errorText);
      return null;
    }

    const userData = await response.json();
    console.log(`Synced user to Discourse: ${userData.username}`);
    return userData.username;
  } catch (error) {
    console.error('Error syncing user to Discourse:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'productId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch product details including owner
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, tagline, description, domain_url, forum_thread_url, user_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error('Product not found:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Skip if already has a forum thread
    if (product.forum_thread_url) {
      console.log(`Product ${product.id} already has forum thread: ${product.forum_thread_url}`);
      return new Response(
        JSON.stringify({ forum_thread_url: product.forum_thread_url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Temporarily disable auto-posting to Discourse.
    // Keep returning 200 so launch flows don't fail while this is paused.
    console.warn('Auto forum posting is temporarily disabled');
    return new Response(
      JSON.stringify({ skipped: true, reason: 'auto_posting_disabled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error creating forum thread:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
