import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { action, productId, code, state, stripeProductId } = await req.json();
    const productionUrl = (Deno.env.get('PRODUCTION_URL') || '').replace(/\/$/, '');

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader && action !== 'callback') {
      throw new Error('Unauthorized');
    }

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) throw new Error('Unauthorized');
      userId = user.id;
    }

    if (action === 'connect') {
      // Generate OAuth link for Stripe Connect
      // Verify user owns the product
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('owner_id')
        .eq('id', productId)
        .single();

      if (error || !product || product.owner_id !== userId) {
        throw new Error('Product not found or unauthorized');
      }

      // Create OAuth link with state containing productId and userId
      const stateData = JSON.stringify({ productId, userId });
      const encodedState = btoa(stateData);
      
      // Redirect to settings page which will handle the callback
      const redirectUri = `${productionUrl}/settings?stripe_callback=true`;
      const connectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${Deno.env.get('STRIPE_CONNECT_CLIENT_ID')}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodedState}`;

      return new Response(
        JSON.stringify({ url: connectUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'callback') {
      // Handle OAuth callback
      if (!code || !state) {
        throw new Error('Missing code or state');
      }

      const stateData = JSON.parse(atob(state));
      const { productId: pId, userId: uId } = stateData;

      // Exchange code for access token
      const response = await stripe.oauth.token({
        grant_type: 'authorization_code',
        code,
      });

      const connectedAccountId = response.stripe_user_id;
      console.log('Connected Stripe account:', connectedAccountId);

      // Get existing stripe_product_id if set
      const { data: existingProduct } = await supabaseAdmin
        .from('products')
        .select('stripe_product_id')
        .eq('id', pId)
        .single();

      // Fetch MRR from the connected account, filtered by product if set
      const mrr = await fetchMRR(stripe, connectedAccountId, existingProduct?.stripe_product_id);
      console.log('Fetched MRR:', mrr);

      // Update product with Stripe Connect info
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({
          stripe_connect_account_id: connectedAccountId,
          verified_mrr: mrr,
          mrr_verified_at: new Date().toISOString(),
        })
        .eq('id', pId)
        .eq('owner_id', uId);

      if (updateError) {
        console.error('Error updating product:', updateError);
        throw new Error('Failed to update product');
      }

      return new Response(
        JSON.stringify({ success: true, mrr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disconnect') {
      // Disconnect Stripe account from product
      const { error } = await supabaseAdmin
        .from('products')
        .update({
          stripe_connect_account_id: null,
          verified_mrr: null,
          mrr_verified_at: null,
        })
        .eq('id', productId)
        .eq('owner_id', userId);

      if (error) throw new Error('Failed to disconnect');

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh') {
      // Refresh MRR for a product
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('stripe_connect_account_id, stripe_product_id, owner_id')
        .eq('id', productId)
        .single();

      if (error || !product || product.owner_id !== userId) {
        throw new Error('Product not found or unauthorized');
      }

      if (!product.stripe_connect_account_id) {
        throw new Error('No Stripe account connected');
      }

      const mrr = await fetchMRR(stripe, product.stripe_connect_account_id, product.stripe_product_id);

      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({
          verified_mrr: mrr,
          mrr_verified_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) throw new Error('Failed to update MRR');

      return new Response(
        JSON.stringify({ success: true, mrr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'set-stripe-product') {
      // Set the Stripe Product ID for filtering
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('owner_id, stripe_connect_account_id')
        .eq('id', productId)
        .single();

      if (error || !product || product.owner_id !== userId) {
        throw new Error('Product not found or unauthorized');
      }

      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ stripe_product_id: stripeProductId || null })
        .eq('id', productId);

      if (updateError) throw new Error('Failed to update Stripe Product ID');

      // If connected, also refresh the MRR with the new filter
      if (product.stripe_connect_account_id) {
        const mrr = await fetchMRR(stripe, product.stripe_connect_account_id, stripeProductId);
        await supabaseAdmin
          .from('products')
          .update({
            verified_mrr: mrr,
            mrr_verified_at: new Date().toISOString(),
          })
          .eq('id', productId);

        return new Response(
          JSON.stringify({ success: true, mrr }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list-stripe-products') {
      // List products from the connected Stripe account
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('stripe_connect_account_id, owner_id')
        .eq('id', productId)
        .single();

      if (error || !product || product.owner_id !== userId) {
        throw new Error('Product not found or unauthorized');
      }

      if (!product.stripe_connect_account_id) {
        throw new Error('No Stripe account connected');
      }

      // Fetch products from the connected account
      const stripeProducts = await stripe.products.list(
        { active: true, limit: 100 },
        { stripeAccount: product.stripe_connect_account_id }
      );

      // Get subscription counts per product for context
      const subscriptions = await stripe.subscriptions.list(
        { status: 'active', limit: 100 },
        { stripeAccount: product.stripe_connect_account_id }
      );

      const productSubCounts: Record<string, number> = {};
      for (const sub of subscriptions.data) {
        for (const item of sub.items.data) {
          const prodId = typeof item.price.product === 'string' ? item.price.product : item.price.product?.id;
          if (prodId) {
            productSubCounts[prodId] = (productSubCounts[prodId] || 0) + 1;
          }
        }
      }

      const productList: Array<{ id: string; name: string; subscriptionCount: number }> = stripeProducts.data.map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name,
        subscriptionCount: productSubCounts[p.id] || 0,
      }));

      // Sort by subscription count descending
      productList.sort((a: { subscriptionCount: number }, b: { subscriptionCount: number }) => b.subscriptionCount - a.subscriptionCount);

      return new Response(
        JSON.stringify({ products: productList }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function fetchMRR(stripe: Stripe, accountId: string, stripeProductIds?: string | null): Promise<number> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60);
    
    console.log('Fetching active subscriptions...');
    console.log('Current timestamp:', now, '=', new Date(now * 1000).toISOString());
    
    // Fetch active subscriptions with expanded data
    const subscriptions = await stripe.subscriptions.list(
      { 
        status: 'active',
        limit: 100,
        expand: ['data.items.data.price', 'data.customer']
      },
      { stripeAccount: accountId }
    );

    console.log('Total active subscriptions:', subscriptions.data.length);

    // Parse comma-separated product IDs into array
    const productIdFilter = stripeProductIds ? stripeProductIds.split(',').map(id => id.trim()) : null;
    console.log('Filtering by Stripe Product IDs:', productIdFilter ? productIdFilter.join(', ') : 'NONE (all products)');

    let totalMRR = 0;
    let countedSubs = 0;
    
    for (const sub of subscriptions.data) {
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      const customerEmail = typeof sub.customer === 'object' && sub.customer ? (sub.customer as any).email : 'unknown';
      
      // Skip if subscription is set to cancel at period end
      if (sub.cancel_at_period_end) {
        console.log(`SKIP ${sub.id} (${customerEmail}) - cancel_at_period_end=true`);
        continue;
      }
      
      // Skip if already cancelled
      if (sub.canceled_at) {
        console.log(`SKIP ${sub.id} (${customerEmail}) - canceled_at is set`);
        continue;
      }
      
      // Skip trials
      if (sub.status === 'trialing' || (sub.trial_end && sub.trial_end > now)) {
        console.log(`SKIP ${sub.id} (${customerEmail}) - in trial`);
        continue;
      }
      
      // Skip if current period already ended
      if (sub.current_period_end < now) {
        console.log(`SKIP ${sub.id} (${customerEmail}) - period ended`);
        continue;
      }
      
      // Calculate MRR from subscription items
      let subMRR = 0;
      let hasMatchingProduct = false;
      let billingInterval = 'unknown';
      let matchedProductId = 'none';
      
      for (const item of sub.items.data) {
        const price = item.price;
        const quantity = item.quantity || 1;
        const productId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
        
        console.log(`  Item check: productId=${productId}, inFilter=${productIdFilter ? productIdFilter.includes(productId) : 'no filter'}`);
        
        // Apply product filter
        if (productIdFilter && productId) {
          if (!productIdFilter.includes(productId)) {
            console.log(`  -> Skipping item, product not in filter`);
            continue;
          }
          hasMatchingProduct = true;
          matchedProductId = productId;
        } else if (!productIdFilter) {
          hasMatchingProduct = true;
          matchedProductId = productId || 'unknown';
        }
        
        if (price.recurring) {
          billingInterval = price.recurring.interval;
          let monthlyAmount = price.unit_amount || 0;
          const interval = price.recurring.interval;
          const intervalCount = price.recurring.interval_count || 1;
          
          // Convert to monthly
          if (interval === 'year') {
            monthlyAmount = Math.round(monthlyAmount / (12 * intervalCount));
          } else if (interval === 'week') {
            monthlyAmount = Math.round((monthlyAmount * 4.33) / intervalCount);
          } else if (interval === 'day') {
            monthlyAmount = Math.round((monthlyAmount * 30) / intervalCount);
          } else if (interval === 'month') {
            monthlyAmount = Math.round(monthlyAmount / intervalCount);
          }
          
          subMRR += monthlyAmount * quantity;
        }
      }
      
      if (hasMatchingProduct && subMRR > 0) {
        // Only count monthly subscriptions that will actually renew (Stripe's MRR definition)
        const willCancel = sub.cancel_at_period_end === true;
        
        if (billingInterval === 'month' && !willCancel) {
          totalMRR += subMRR;
          countedSubs++;
          console.log(`COUNT ${sub.id}: ${customerEmail}, interval=${billingInterval}, MRR=$${(subMRR/100).toFixed(2)}`);
        } else if (willCancel) {
          console.log(`SKIP ${sub.id} (${customerEmail}) - set to cancel at period end`);
        } else {
          console.log(`SKIP ${sub.id} (${customerEmail}) - non-monthly subscription (interval=${billingInterval})`);
        }
      }
    }

    console.log('Subscriptions counted:', countedSubs);
    console.log('Final calculated MRR cents:', totalMRR, '= $' + (totalMRR / 100).toFixed(2));
    return totalMRR;
  } catch (error) {
    console.error('Error fetching MRR:', error);
    return 0;
  }
}
