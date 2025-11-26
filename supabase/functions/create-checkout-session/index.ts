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

    // Price ID mapping - these are the actual Stripe price IDs
    const priceIdMap: Record<string, string> = {
      join: 'price_1SXE8NL6sVtfkDGlQZEi0eOb',    // $9
      skip: 'price_1SXE8OL6sVtfkDGlEhEGF1dY',   // $39
      relaunch: 'price_1SXE8PL6sVtfkDGlvVDVkYf6' // $19
    };

    const priceId = priceIdMap[plan];
    if (!priceId) {
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
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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