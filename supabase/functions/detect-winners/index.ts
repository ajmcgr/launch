import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';

Deno.serve(async (req) => {
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
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find top 3 weekly products (launched in last 7 days with most votes)
    const { data: weeklyVotes, error: weeklyError } = await supabaseClient
      .from('votes')
      .select('product_id, value, products!inner(launch_date, status)')
      .gte('products.launch_date', oneWeekAgo.toISOString())
      .eq('products.status', 'launched');

    if (weeklyError) {
      console.error('Error fetching weekly votes:', weeklyError);
      throw weeklyError;
    }

    const winners = {
      gold: null as string | null,   // #1 weekly → won_monthly
      silver: null as string | null, // #2 weekly → won_weekly
      bronze: null as string | null, // #3 weekly → won_daily
    };

    if (weeklyVotes && weeklyVotes.length > 0) {
      const productVotes: Record<string, number> = {};
      weeklyVotes.forEach((vote: any) => {
        productVotes[vote.product_id] = (productVotes[vote.product_id] || 0) + vote.value;
      });

      const sorted = Object.entries(productVotes).sort((a, b) => b[1] - a[1]);

      if (sorted[0]) {
        winners.gold = sorted[0][0];
        console.log(`🥇 Gold (#1 Weekly): ${sorted[0][0]} with ${sorted[0][1]} votes`);
      }
      if (sorted[1]) {
        winners.silver = sorted[1][0];
        console.log(`🥈 Silver (#2 Weekly): ${sorted[1][0]} with ${sorted[1][1]} votes`);
      }
      if (sorted[2]) {
        winners.bronze = sorted[2][0];
        console.log(`🥉 Bronze (#3 Weekly): ${sorted[2][0]} with ${sorted[2][1]} votes`);
      }
    }

    // NOTE: We do NOT reset winner flags - once a product wins, it keeps that badge permanently
    // won_monthly = Gold (#1 weekly), won_weekly = Silver (#2 weekly), won_daily = Bronze (#3 weekly)
    console.log('Setting new winners (preserving past winners)...');

    const updates = [];

    if (winners.gold) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_monthly: true })
          .eq('id', winners.gold)
      );
    }

    if (winners.silver) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_weekly: true })
          .eq('id', winners.silver)
      );
    }

    if (winners.bronze) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_daily: true })
          .eq('id', winners.bronze)
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
        message: 'Winner detection completed — top 3 weekly products awarded'
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
