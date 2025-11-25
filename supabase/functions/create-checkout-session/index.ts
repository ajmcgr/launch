import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

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

    console.log('User authenticated:', user.id);

    // Price ID mapping - these are the actual Stripe price IDs
    // IMPORTANT: You need to create new Stripe products with the updated prices:
    // - Launch (skip): $39 (currently mapped to old $19 price)
    // - Relaunch: $19 (currently mapped to old $12 price)
    // Then update the price IDs below with the new ones from your Stripe dashboard
    const priceIdMap: Record<string, string> = {
      join: 'price_1SVnzHL6sVtfkDGlI3qbH6UN',    // $9
      skip: 'price_1SVnzIL6sVtfkDGl60DAVmhv',   // UPDATE THIS: Should be $39 price ID
      relaunch: 'price_1SVnzIL6sVtfkDGlBQi5EeHG' // UPDATE THIS: Should be $19 price ID
    };

    const priceId = priceIdMap[plan];
    if (!priceId) {
      throw new Error('Invalid plan');
    }

    // Create Stripe checkout session
    const productionUrl = (Deno.env.get('PRODUCTION_URL') || req.headers.get('origin') || '').replace(/\/$/, '');
    console.log('Using production URL:', productionUrl);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${productionUrl}/my-products?success=true`,
      cancel_url: `${productionUrl}/submit?canceled=true`,
      metadata: {
        user_id: user.id,
        plan,
        selected_date: selectedDate || '',
        product_id: productId,
      },
    });

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