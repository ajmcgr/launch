import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log('Webhook event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (!metadata) {
        throw new Error('No metadata found in session');
      }

      console.log('Processing payment for user:', metadata.user_id);

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Helper function to find next available date with capacity
      const findNextAvailableDate = async (startDaysFromNow: number): Promise<string> => {
        const MAX_DAILY_CAPACITY = 100; // Cap at 100 launches per day
        let daysToCheck = startDaysFromNow;
        const maxAttempts = 365; // Don't check more than a year ahead
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + daysToCheck);
          checkDate.setHours(9, 0, 0, 0); // 4am EST = 9am UTC
          
          // Calculate the start and end of the day for this date
          const dayStart = new Date(checkDate);
          dayStart.setHours(0, 0, 0, 0);
          
          const dayEnd = new Date(checkDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          // Count products scheduled for this day
          const { count } = await supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'launched')
            .gte('launch_date', dayStart.toISOString())
            .lte('launch_date', dayEnd.toISOString());
          
          console.log(`Checking day ${checkDate.toDateString()}: ${count}/${MAX_DAILY_CAPACITY} launches`);
          
          if ((count ?? 0) < MAX_DAILY_CAPACITY) {
            return checkDate.toISOString();
          }
          
          // Move to next day if this day is full
          daysToCheck += 1;
        }
        
        // Fallback if no date found (shouldn't happen)
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + daysToCheck);
        fallbackDate.setHours(9, 0, 0, 0);
        return fallbackDate.toISOString();
      };

      // Determine launch date based on plan
      let launchDate: string;
      const plan = metadata.plan;
      
      if (plan === 'skip') {
        // Skip the Line: Use the selected date from metadata
        launchDate = metadata.selected_date || await findNextAvailableDate(1);
      } else if (plan === 'join') {
        // Join the Line: First available date >7 days out
        launchDate = await findNextAvailableDate(8);
      } else if (plan === 'relaunch') {
        // Relaunch: First available date >30 days out
        launchDate = await findNextAvailableDate(31);
      } else {
        // Default fallback
        launchDate = await findNextAvailableDate(1);
      }

      console.log(`Assigning launch date for plan '${plan}': ${launchDate}`);

      // Determine if product should be 'scheduled' or 'launched'
      const now = new Date();
      const launchDateObj = new Date(launchDate);
      const shouldBeScheduled = launchDateObj > now;

      // Fetch the product by ID
      const { data: product, error: productError } = await supabaseClient
        .from('products')
        .select('id, slug')
        .eq('id', metadata.product_id)
        .single();

      if (productError || !product) {
        console.error('Error fetching product:', productError);
        throw new Error('Product not found');
      }

      console.log('Updating product:', product.id);
      
      // Update product with launch date and status
      const { error: updateError } = await supabaseClient
        .from('products')
        .update({
          status: shouldBeScheduled ? 'scheduled' : 'launched',
          launch_date: launchDate,
        })
        .eq('id', product.id);

      if (updateError) {
        console.error('Error updating product:', updateError);
        throw updateError;
      }
      
      console.log('Product updated successfully');

      // Create order record
      await supabaseClient
        .from('orders')
        .insert({
          user_id: metadata.user_id,
          product_id: product.id,
          stripe_session_id: session.id,
          plan: metadata.plan,
        });

      console.log('Order and product created successfully');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook error' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});