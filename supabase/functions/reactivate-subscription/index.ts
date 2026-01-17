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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized - No auth header');
    }

    const token = authHeader.replace('Bearer ', '');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the JWT token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized - Invalid token');
    }

    // Get user's subscription ID
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      throw new Error('Failed to fetch user data');
    }

    if (!userData?.stripe_subscription_id) {
      throw new Error('No subscription found');
    }

    // Reactivate the subscription (remove cancel_at_period_end)
    const subscription = await stripe.subscriptions.update(userData.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Update user record
    await supabaseAdmin
      .from('users')
      .update({
        subscription_cancel_at_period_end: false,
      })
      .eq('id', user.id);

    console.log('Subscription reactivated:', subscription.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscription reactivated successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to reactivate subscription' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
