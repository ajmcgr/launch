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
        const MAX_WEEKLY_CAPACITY = 1; // Only 1 launch per week total
        let daysToCheck = startDaysFromNow;
        const maxAttempts = 365; // Don't check more than a year ahead
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + daysToCheck);
          checkDate.setHours(0, 0, 0, 0);
          
          // Calculate the start of the week (Monday) for this date
          const weekStart = new Date(checkDate);
          const dayOfWeek = weekStart.getDay();
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
          weekStart.setDate(weekStart.getDate() + diff);
          weekStart.setHours(0, 0, 0, 0);
          
          // Calculate the end of the week (Sunday)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          
          // Count products scheduled for this week
          const { count } = await supabaseClient
            .from('products')
            .select('*', { count: 'exact', head: true })
            .gte('launch_date', weekStart.toISOString())
            .lt('launch_date', weekEnd.toISOString());
          
          console.log(`Checking week starting ${weekStart.toISOString()}: ${count}/${MAX_WEEKLY_CAPACITY} launches`);
          
          if ((count ?? 0) < MAX_WEEKLY_CAPACITY) {
            return checkDate.toISOString();
          }
          
          // Move to next week if this week is full
          daysToCheck += 7;
        }
        
        // Fallback if no date found (shouldn't happen)
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + daysToCheck);
        return fallbackDate.toISOString();
      };

      // Determine launch date based on plan
      let launchDate: string;
      const plan = metadata.plan;
      
      if (plan === 'skip') {
        // Launch plan: Use the selected date from metadata
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

      // Check if a draft product with this slug already exists
      const { data: existingProduct } = await supabaseClient
        .from('products')
        .select('id, status, owner_id')
        .eq('slug', metadata.product_slug)
        .eq('owner_id', metadata.user_id)
        .maybeSingle();

      let product;
      
      if (existingProduct && existingProduct.status === 'draft') {
        // Update existing draft product
        console.log('Updating existing draft product:', existingProduct.id);
        const { data: updatedProduct, error: updateError } = await supabaseClient
          .from('products')
          .update({
            name: metadata.product_name,
            tagline: metadata.product_tagline,
            description: metadata.product_description,
            domain_url: metadata.product_url,
            status: plan === 'relaunch' ? 'scheduled' : 'launched',
            launch_date: launchDate,
          })
          .eq('id', existingProduct.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating product:', updateError);
          throw updateError;
        }
        product = updatedProduct;
        console.log('Product updated:', product.id);
      } else {
        // Create new product
        console.log('Creating new product');
        const { data: newProduct, error: productError } = await supabaseClient
          .from('products')
          .insert({
            owner_id: metadata.user_id,
            name: metadata.product_name,
            tagline: metadata.product_tagline,
            description: metadata.product_description,
            domain_url: metadata.product_url,
            slug: metadata.product_slug,
            status: plan === 'relaunch' ? 'scheduled' : 'launched',
            launch_date: launchDate,
          })
          .select()
          .single();

        if (productError) {
          console.error('Error creating product:', productError);
          throw productError;
        }
        product = newProduct;
        console.log('Product created:', product.id);
      }

      // Add categories
      const categories = JSON.parse(metadata.product_categories || '[]');
      if (categories.length > 0) {
        // Get category IDs
        const { data: categoryData } = await supabaseClient
          .from('product_categories')
          .select('id, name')
          .in('name', categories);

        if (categoryData) {
          const categoryMappings = categoryData.map(cat => ({
            product_id: product.id,
            category_id: cat.id,
          }));

          await supabaseClient
            .from('product_category_map')
            .insert(categoryMappings);
        }
      }

      // Add media if provided and product is new (not updating draft with existing media)
      if (!existingProduct || existingProduct.status !== 'draft') {
        const mediaInserts = [];
        if (metadata.product_icon) {
          mediaInserts.push({ product_id: product.id, type: 'icon', url: metadata.product_icon });
        }
        if (metadata.product_thumbnail) {
          mediaInserts.push({ product_id: product.id, type: 'thumbnail', url: metadata.product_thumbnail });
        }
        const screenshots = JSON.parse(metadata.product_screenshots || '[]');
        screenshots.forEach((url: string) => {
          mediaInserts.push({ product_id: product.id, type: 'screenshot', url });
        });

        if (mediaInserts.length > 0) {
          await supabaseClient.from('product_media').insert(mediaInserts);
        }
      }

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