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
    // Use invoice-based MRR calculation to match Stripe's dashboard
    // Fetch paid subscription invoices from the last 60 days
    const now = Math.floor(Date.now() / 1000);
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60);
    
    console.log('Fetching invoices from last 60 days...');
    console.log('Current timestamp:', now, '=', new Date(now * 1000).toISOString());
    
    // Fetch recent paid invoices
    const invoices = await stripe.invoices.list(
      { 
        status: 'paid',
        created: { gte: sixtyDaysAgo },
        limit: 100,
        expand: ['data.subscription', 'data.lines.data']
      },
      { stripeAccount: accountId }
    );

    console.log('Total paid invoices in last 60 days:', invoices.data.length);

    // Parse comma-separated product IDs into array
    const productIdFilter = stripeProductIds ? stripeProductIds.split(',').map(id => id.trim()) : null;
    console.log('Filtering by Stripe Product IDs:', productIdFilter ? productIdFilter.join(', ') : 'NONE (all products)');

    // Track unique active subscriptions and their MRR
    const subscriptionMRR: Map<string, { mrr: number; customerId: string; periodEnd: number }> = new Map();
    
    for (const invoice of invoices.data) {
      // Only count subscription invoices
      if (!invoice.subscription) {
        console.log(`Skipping invoice ${invoice.id} - not a subscription invoice`);
        continue;
      }

      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
      const subscription = typeof invoice.subscription === 'object' ? invoice.subscription : null;
      
      // Skip if subscription is cancelled or set to cancel
      if (subscription) {
        if (subscription.cancel_at_period_end) {
          console.log(`Skipping sub ${subId} - cancel_at_period_end=true`);
          continue;
        }
        if (subscription.canceled_at) {
          console.log(`Skipping sub ${subId} - canceled_at is set`);
          continue;
        }
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          console.log(`Skipping sub ${subId} - status=${subscription.status}`);
          continue;
        }
        // Skip trials that haven't started paying
        if (subscription.status === 'trialing') {
          console.log(`Skipping sub ${subId} - still in trial`);
          continue;
        }
      }

      // Calculate MRR from invoice lines
      let invoiceMRR = 0;
      let hasMatchingProduct = false;
      
      for (const line of invoice.lines.data) {
        // Only count subscription line items
        if (line.type !== 'subscription') continue;
        
        const productId = typeof line.price?.product === 'string' 
          ? line.price.product 
          : line.price?.product?.id;
        
        // Apply product filter if set
        if (productIdFilter && productId) {
          if (!productIdFilter.includes(productId)) continue;
          hasMatchingProduct = true;
        }
        
        if (line.price?.recurring) {
          let monthlyAmount = line.amount || 0;
          const interval = line.price.recurring.interval;
          const intervalCount = line.price.recurring.interval_count || 1;
          
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
          
          invoiceMRR += monthlyAmount;
        }
      }
      
      // Only add if we're not filtering, or if this invoice has a matching product
      if (!productIdFilter || hasMatchingProduct || !productIdFilter) {
        if (invoiceMRR > 0) {
          const periodEnd = subscription?.current_period_end || invoice.period_end || 0;
          
          // Only keep the most recent invoice for each subscription
          // and only if the subscription period is still active
          if (periodEnd > now) {
            const existing = subscriptionMRR.get(subId);
            if (!existing || periodEnd > existing.periodEnd) {
              subscriptionMRR.set(subId, {
                mrr: invoiceMRR,
                customerId: invoice.customer as string,
                periodEnd: periodEnd
              });
              console.log(`Sub ${subId}: customer=${invoice.customer}, MRR=${invoiceMRR} cents ($${(invoiceMRR/100).toFixed(2)}), period_end=${new Date(periodEnd * 1000).toISOString()}`);
            }
          } else {
            console.log(`Skipping sub ${subId} - period_end in past: ${new Date(periodEnd * 1000).toISOString()}`);
          }
        }
      }
    }

    // Sum up MRR from all active subscriptions
    let totalMRR = 0;
    for (const [subId, data] of subscriptionMRR) {
      totalMRR += data.mrr;
    }

    console.log('Active subscriptions with future period_end:', subscriptionMRR.size);
    console.log('Final calculated MRR cents:', totalMRR, '= $' + (totalMRR / 100).toFixed(2));
    return totalMRR;
  } catch (error) {
    console.error('Error fetching MRR:', error);
    return 0;
  }
}
