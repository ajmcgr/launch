import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header provided');
      throw new Error('Unauthorized - No auth header');
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { plan, selectedDate, productId } = await req.json();

    // Verify the JWT token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('Error verifying user token:', userError);
      throw new Error('Unauthorized - Invalid token');
    }
    
    if (!user) {
      console.error('No user found from token');
      throw new Error('Unauthorized - No user');
    }

    // Plan pricing configuration (amounts in cents)
    const planConfig: Record<string, { amount: number; name: string; isSubscription?: boolean }> = {
      join: { amount: 900, name: 'Launch Lite - $9' },
      skip: { amount: 3900, name: 'Launch - $39' },
      relaunch: { amount: 1900, name: 'Relaunch - $19' },
      annual_access: { amount: 9900, name: 'Launch Pass - $99/year', isSubscription: true }
    };

    const selectedPlan = planConfig[plan];
    if (!selectedPlan) {
      throw new Error('Invalid plan');
    }

    // Get or create Stripe customer
    let customerId: string;
    
    // Check if user already has a Stripe customer ID
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching user data:', fetchError);
      throw new Error('Failed to fetch user data');
    }

    if (userData?.stripe_customer_id) {
      customerId = userData.stripe_customer_id;
      console.log('Using existing Stripe customer:', customerId);
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('Created new Stripe customer:', customerId);

      // Update user with Stripe customer ID
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update user with customer ID:', updateError);
        // Don't fail the checkout if we can't update the DB
      }
    }

    // Create Stripe checkout session
    const productionUrl = (Deno.env.get('PRODUCTION_URL') || req.headers.get('origin') || '').replace(/\/$/, '');
    console.log('Using production URL:', productionUrl);
    
    // Set success/cancel URLs based on plan type
    const isAnnualAccess = plan === 'annual_access';
    const successUrl = isAnnualAccess 
      ? `${productionUrl}/settings?tab=billing&success=annual`
      : `${productionUrl}/my-products?success=true`;
    const cancelUrl = isAnnualAccess
      ? `${productionUrl}/settings?tab=billing&canceled=true`
      : `${productionUrl}/submit?canceled=true`;
    
    let session;
    
    if (selectedPlan.isSubscription) {
      // Create a subscription checkout for annual_access
      // First, find or create a price for the subscription
      let priceId: string;
      
      // Check if we have an existing price for this product
      const prices = await stripe.prices.list({
        lookup_keys: ['launch_pass_yearly'],
        limit: 1,
      });
      
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        // Create the product and price if they don't exist
        const product = await stripe.products.create({
          name: 'Launch Pass',
          description: 'Unlimited access to all Launch features for one year',
        });
        
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: selectedPlan.amount,
          currency: 'usd',
          recurring: {
            interval: 'year',
          },
          lookup_key: 'launch_pass_yearly',
        });
        
        priceId = price.id;
      }
      
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan,
          },
        },
        metadata: {
          user_id: user.id,
          plan,
        },
      });
    } else {
      // One-time payment for other plans
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: selectedPlan.name,
              },
              unit_amount: selectedPlan.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: user.id,
          plan,
          selected_date: selectedDate || '',
          product_id: productId || '',
        },
      });
    }

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create checkout session' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});