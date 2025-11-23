import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WinnerResult {
  daily: string | null;
  weekly: string | null;
  monthly: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Starting winner detection...');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const winners: WinnerResult = {
      daily: null,
      weekly: null,
      monthly: null,
    };

    // Find daily winner (launched products in last 24 hours with most votes)
    const { data: dailyVotes, error: dailyError } = await supabaseClient
      .from('votes')
      .select('product_id, value, products!inner(launch_date, status)')
      .gte('products.launch_date', oneDayAgo.toISOString())
      .eq('products.status', 'launched');

    if (dailyError) {
      console.error('Error fetching daily votes:', dailyError);
    } else if (dailyVotes && dailyVotes.length > 0) {
      const productVotes: Record<string, number> = {};
      dailyVotes.forEach((vote: any) => {
        productVotes[vote.product_id] = (productVotes[vote.product_id] || 0) + vote.value;
      });
      const topProduct = Object.entries(productVotes).sort((a, b) => b[1] - a[1])[0];
      if (topProduct) {
        winners.daily = topProduct[0];
        console.log(`Daily winner: ${topProduct[0]} with ${topProduct[1]} votes`);
      }
    }

    // Find weekly winner (launched products in last 7 days with most votes)
    const { data: weeklyVotes, error: weeklyError } = await supabaseClient
      .from('votes')
      .select('product_id, value, products!inner(launch_date, status)')
      .gte('products.launch_date', oneWeekAgo.toISOString())
      .eq('products.status', 'launched');

    if (weeklyError) {
      console.error('Error fetching weekly votes:', weeklyError);
    } else if (weeklyVotes && weeklyVotes.length > 0) {
      const productVotes: Record<string, number> = {};
      weeklyVotes.forEach((vote: any) => {
        productVotes[vote.product_id] = (productVotes[vote.product_id] || 0) + vote.value;
      });
      const topProduct = Object.entries(productVotes).sort((a, b) => b[1] - a[1])[0];
      if (topProduct) {
        winners.weekly = topProduct[0];
        console.log(`Weekly winner: ${topProduct[0]} with ${topProduct[1]} votes`);
      }
    }

    // Find monthly winner (launched products in last 30 days with most votes)
    const { data: monthlyVotes, error: monthlyError } = await supabaseClient
      .from('votes')
      .select('product_id, value, products!inner(launch_date, status)')
      .gte('products.launch_date', oneMonthAgo.toISOString())
      .eq('products.status', 'launched');

    if (monthlyError) {
      console.error('Error fetching monthly votes:', monthlyError);
    } else if (monthlyVotes && monthlyVotes.length > 0) {
      const productVotes: Record<string, number> = {};
      monthlyVotes.forEach((vote: any) => {
        productVotes[vote.product_id] = (productVotes[vote.product_id] || 0) + vote.value;
      });
      const topProduct = Object.entries(productVotes).sort((a, b) => b[1] - a[1])[0];
      if (topProduct) {
        winners.monthly = topProduct[0];
        console.log(`Monthly winner: ${topProduct[0]} with ${topProduct[1]} votes`);
      }
    }

    // Reset all winner flags first
    const { error: resetError } = await supabaseClient
      .from('products')
      .update({ won_daily: false, won_weekly: false, won_monthly: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    if (resetError) {
      console.error('Error resetting winner flags:', resetError);
    } else {
      console.log('Reset all winner flags');
    }

    // Set new winners
    const updates = [];
    
    if (winners.daily) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_daily: true })
          .eq('id', winners.daily)
      );
    }
    
    if (winners.weekly) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_weekly: true })
          .eq('id', winners.weekly)
      );
    }
    
    if (winners.monthly) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_monthly: true })
          .eq('id', winners.monthly)
      );
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        console.error('Errors updating winners:', errors);
      } else {
        console.log('Successfully updated all winners');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        winners,
        message: 'Winner detection completed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in detect-winners function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
