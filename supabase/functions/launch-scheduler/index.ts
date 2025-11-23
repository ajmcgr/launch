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

    console.log('Starting launch scheduler check...');

    // Find all products scheduled to launch that are past their launch date
    const { data: productsToLaunch, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'scheduled')
      .lte('launch_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled products:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${productsToLaunch?.length || 0} products to launch`);

    if (!productsToLaunch || productsToLaunch.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No products to launch', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = [];

    for (const product of productsToLaunch) {
      console.log(`Launching product: ${product.name} (${product.id})`);

      // Update product status to 'live'
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ status: 'live' })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Error launching product ${product.id}:`, updateError);
        results.push({ id: product.id, success: false, error: updateError.message });
        continue;
      }

      // Get all followers of this product
      const { data: followers, error: followersError } = await supabaseAdmin
        .from('product_follows')
        .select('follower_id')
        .eq('product_id', product.id);

      if (followersError) {
        console.error(`Error fetching followers for ${product.id}:`, followersError);
      }

      // Send notifications to all followers
      if (followers && followers.length > 0) {
        console.log(`Notifying ${followers.length} followers of product ${product.id}`);
        
        for (const follower of followers) {
          try {
            await supabaseAdmin.functions.invoke('send-notifications', {
              body: {
                userId: follower.follower_id,
                type: 'product_launch',
                title: `${product.name} just launched!`,
                message: `The product you're following is now live.`,
                relatedProductId: product.id,
              },
            });
          } catch (notifError) {
            console.error(`Error sending notification to follower ${follower.follower_id}:`, notifError);
          }
        }
        
        console.log(`Sent notifications to ${followers.length} followers for product ${product.id}`);
      }

      results.push({ id: product.id, name: product.name, success: true });
    }

    console.log('Launch scheduler completed');

    return new Response(
      JSON.stringify({ 
        message: 'Launch scheduler completed',
        launched: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in launch scheduler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});