import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
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

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Helper function to find next available date with capacity
      // For Launch (skip) plan, only count other 'skip' plan products
      // For other plans, count all products
      const findNextAvailableDate = async (startDaysFromNow: number, planType?: string): Promise<string> => {
        const MAX_DAILY_CAPACITY = 100; // Cap at 100 launches per day
        let daysToCheck = startDaysFromNow;
        const maxAttempts = 365; // Don't check more than a year ahead
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + daysToCheck);
          checkDate.setHours(0, 1, 0, 0); // 12:01 AM PST
          
          // Calculate the start and end of the day for this date
          const dayStart = new Date(checkDate);
          dayStart.setHours(0, 0, 0, 0);
          
          const dayEnd = new Date(checkDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          let count: number | null = 0;
          
          if (planType === 'skip') {
            // For Launch (skip) plan, only count other 'skip' plan products
            // This allows Launch plan to bump Free, Join, and Relaunch plans
            const { data: skipProducts } = await supabaseClient
              .from('orders')
              .select('product_id')
              .eq('plan', 'skip');
            
            const skipProductIds = skipProducts?.map(o => o.product_id).filter(Boolean) || [];
            
            if (skipProductIds.length > 0) {
              const { count: skipCount } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .in('id', skipProductIds)
                .in('status', ['scheduled', 'launched'])
                .gte('launch_date', dayStart.toISOString())
                .lte('launch_date', dayEnd.toISOString());
              count = skipCount;
            }
          } else if (planType === 'relaunch') {
            // For Relaunch plan, only count 'skip' and 'relaunch' plan products
            // This allows Relaunch to bump Free and Join plans, but not Launch
            const { data: priorityProducts } = await supabaseClient
              .from('orders')
              .select('product_id')
              .in('plan', ['skip', 'relaunch']);
            
            const priorityProductIds = priorityProducts?.map(o => o.product_id).filter(Boolean) || [];
            
            if (priorityProductIds.length > 0) {
              const { count: priorityCount } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .in('id', priorityProductIds)
                .in('status', ['scheduled', 'launched'])
                .gte('launch_date', dayStart.toISOString())
                .lte('launch_date', dayEnd.toISOString());
              count = priorityCount;
            }
          } else {
            // For Free and Join plans, count all products
            const { count: totalCount } = await supabaseClient
              .from('products')
              .select('*', { count: 'exact', head: true })
              .in('status', ['scheduled', 'launched'])
              .gte('launch_date', dayStart.toISOString())
              .lte('launch_date', dayEnd.toISOString());
            count = totalCount;
          }
          
          console.log(`Checking day ${checkDate.toDateString()} for ${planType || 'default'}: ${count}/${MAX_DAILY_CAPACITY} launches`);
          
          if ((count ?? 0) < MAX_DAILY_CAPACITY) {
            return checkDate.toISOString();
          }
          
          // Move to next day if this day is full
          daysToCheck += 1;
        }
        
        // Fallback if no date found (shouldn't happen)
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + daysToCheck);
        fallbackDate.setHours(0, 1, 0, 0); // 12:01 AM PST
        return fallbackDate.toISOString();
      };

      // Helper function to check if a specific date has capacity for Launch (skip) plan
      const checkLaunchPlanCapacity = async (dateStr: string): Promise<boolean> => {
        const MAX_DAILY_CAPACITY = 100;
        const checkDate = new Date(dateStr);
        
        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Only count other 'skip' plan products
        const { data: skipProducts } = await supabaseClient
          .from('orders')
          .select('product_id')
          .eq('plan', 'skip');
        
        const skipProductIds = skipProducts?.map(o => o.product_id).filter(Boolean) || [];
        
        if (skipProductIds.length === 0) return true;
        
        const { count } = await supabaseClient
          .from('products')
          .select('*', { count: 'exact', head: true })
          .in('id', skipProductIds)
          .in('status', ['scheduled', 'launched'])
          .gte('launch_date', dayStart.toISOString())
          .lte('launch_date', dayEnd.toISOString());
        
        console.log(`Launch plan capacity check for ${checkDate.toDateString()}: ${count}/${MAX_DAILY_CAPACITY}`);
        return (count ?? 0) < MAX_DAILY_CAPACITY;
      };

      // Determine launch date based on plan
      let launchDate: string;
      const plan = metadata.plan;
      
      if (plan === 'skip') {
        // Launch plan: Use the selected date, but validate capacity
        if (metadata.selected_date) {
          const hasCapacity = await checkLaunchPlanCapacity(metadata.selected_date);
          if (hasCapacity) {
            launchDate = metadata.selected_date;
          } else {
            // If selected date is full of Launch plans, find next available
            console.log('Selected date full of Launch plans, finding next available...');
            launchDate = await findNextAvailableDate(1, 'skip');
          }
        } else {
          launchDate = await findNextAvailableDate(1, 'skip');
        }
      } else if (plan === 'join') {
        // Join the Line: First available date >7 days out
        launchDate = await findNextAvailableDate(8);
      } else if (plan === 'relaunch') {
        // Relaunch: First available date >30 days out (only counting Launch + Relaunch plans)
        launchDate = await findNextAvailableDate(31, 'relaunch');
      } else {
        // Default fallback (free plan)
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});