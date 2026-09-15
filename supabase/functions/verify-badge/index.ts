import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { productId } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Verifying badge for product: ${productId}`);

    // Get product details
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('domain_url, slug, owner_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if user owns this product
    if (product.owner_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not product owner' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (!product.domain_url) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'No domain URL set for product' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Fetching ${product.domain_url} to verify badge`);

    // SSRF protection: only fetch public http/https URLs.
    const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata']);
    const BLOCKED_SUFFIXES = ['.internal', '.local', '.lan', '.corp', '.home.arpa'];

    const isPrivateIpLiteral = (host: string): boolean => {
      const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (ipv4) {
        const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
        return (
          a === 10 || a === 127 || a === 0 ||
          (a === 172 && b >= 16 && b <= 31) ||
          (a === 192 && b === 168) ||
          (a === 169 && b === 254) ||
          (a === 100 && b >= 64 && b <= 127)
        );
      }
      const h = host.toLowerCase().replace(/^\[|\]$/g, '');
      return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80');
    };

    const validateFetchUrl = (input: string): { ok: true; url: URL } | { ok: false; error: string } => {
      let url: URL;
      try {
        url = new URL(input);
      } catch {
        return { ok: false, error: 'Invalid URL' };
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { ok: false, error: 'Only http/https URLs are allowed' };
      }
      const host = url.hostname.toLowerCase();
      if (BLOCKED_HOSTNAMES.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s)) || isPrivateIpLiteral(host)) {
        return { ok: false, error: 'Refusing to fetch a private or internal address' };
      }
      return { ok: true, url };
    };

    // Fetch with manual redirect handling so every hop is re-validated.
    let websiteHtml: string;
    try {
      let current = product.domain_url as string;
      let response: Response | null = null;
      for (let hop = 0; hop <= 3; hop++) {
        const check = validateFetchUrl(current);
        if (!check.ok) throw new Error(check.error);
        response = await fetch(check.url.toString(), {
          headers: { 'User-Agent': 'Launch-Badge-Verifier/1.0' },
          signal: AbortSignal.timeout(10000), // 10 second timeout
          redirect: 'manual',
        });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) throw new Error(`HTTP ${response.status} redirect without Location`);
          current = new URL(location, check.url).toString();
          response = null;
          continue;
        }
        break;
      }
      if (!response) throw new Error('Too many redirects');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      websiteHtml = await response.text();
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error('Error fetching website:', fetchError);

      // Update last check time even on failure
      await supabaseAdmin
        .from('products')
        .update({ last_badge_check: new Date().toISOString() })
        .eq('id', productId);

      return new Response(
        JSON.stringify({
          verified: false,
          error: `Could not fetch website: ${errorMessage}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check for badge presence
    // Look for: 
    // 1. Link to product page (https://trylaunch.ai/launch/{slug})
    // 2. Link to trylaunch.ai with dofollow
    const productLinkRegex = new RegExp(`href=["']https://trylaunch\\.ai/launch/${product.slug}["'][^>]*rel=["']dofollow["']`, 'i');
    const trylaunchLinkRegex = /href=["']https:\/\/trylaunch\.ai[^"']*["'][^>]*rel=["']dofollow["']/i;
    
    const hasProductLink = productLinkRegex.test(websiteHtml);
    const hasTrylaunchLink = trylaunchLinkRegex.test(websiteHtml);
    
    const verified = hasProductLink && hasTrylaunchLink;

    console.log(`Verification result for ${product.slug}:`, {
      hasProductLink,
      hasTrylaunchLink,
      verified,
    });

    // Update product verification status
    const updateData: any = {
      last_badge_check: new Date().toISOString(),
    };

    if (verified) {
      updateData.badge_embedded = true;
      updateData.badge_verified_at = new Date().toISOString();
    } else {
      updateData.badge_embedded = false;
      updateData.badge_verified_at = null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating product:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        verified,
        message: verified 
          ? 'Badge verified! Your product now has a dofollow backlink on Launch.'
          : 'Badge not found or not properly configured. Make sure you embed the badge with both links (product + Launch) with rel="dofollow".'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in verify-badge function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
