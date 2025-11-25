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

    // Fetch the product's website
    let websiteHtml: string;
    try {
      const response = await fetch(product.domain_url, {
        headers: {
          'User-Agent': 'Launch-Badge-Verifier/1.0',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

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
