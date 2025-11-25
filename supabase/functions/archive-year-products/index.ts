import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting year archiving process...');

    // Get the year to archive (previous year)
    const now = new Date();
    const archiveYear = now.getFullYear() - 1;

    console.log(`Archiving products for year: ${archiveYear}`);

    const periods = ['today', 'week', 'month', 'year'] as const;
    let totalArchived = 0;

    for (const period of periods) {
      console.log(`Processing period: ${period}`);

      // Get date range for the period
      const { start, end } = getDateRangeForPeriod(period, archiveYear);

      console.log(`Date range: ${start} to ${end}`);

      // Fetch products launched in that period
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, launch_date')
        .eq('status', 'launched')
        .gte('launch_date', start)
        .lte('launch_date', end);

      if (productsError) {
        console.error(`Error fetching products for ${period}:`, productsError);
        continue;
      }

      console.log(`Found ${products?.length || 0} products for ${period}`);

      if (!products || products.length === 0) {
        console.log(`No products found for ${period}, skipping...`);
        continue;
      }

      // Get vote counts for these products
      const productIds = products.map(p => p.id);
      const { data: voteCounts, error: votesError } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes')
        .in('product_id', productIds);

      if (votesError) {
        console.error(`Error fetching votes for ${period}:`, votesError);
        continue;
      }

      // Create a map of votes
      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      // Sort products by votes and take top 100
      const topProducts = products
        .map(p => ({
          product_id: p.id,
          net_votes: voteMap.get(p.id) || 0
        }))
        .sort((a, b) => b.net_votes - a.net_votes)
        .slice(0, 100)
        .map((p, index) => ({
          year: archiveYear,
          period,
          product_id: p.product_id,
          rank: index + 1,
          net_votes: p.net_votes
        }));

      console.log(`Archiving top ${topProducts.length} products for ${period}`);

      // Insert archives (using upsert to handle duplicates)
      const { error: insertError } = await supabase
        .from('product_archives')
        .upsert(topProducts, {
          onConflict: 'year,period,product_id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error(`Error inserting archives for ${period}:`, insertError);
      } else {
        totalArchived += topProducts.length;
        console.log(`Successfully archived ${topProducts.length} products for ${period}`);
      }
    }

    console.log(`Archive complete. Total products archived: ${totalArchived}`);

    return new Response(
      JSON.stringify({
        success: true,
        year: archiveYear,
        totalArchived,
        message: `Successfully archived ${totalArchived} products for year ${archiveYear}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in archive-year-products:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function getDateRangeForPeriod(period: 'today' | 'week' | 'month' | 'year', year: number) {
  const start = new Date(year, 0, 1); // January 1st of the year
  const end = new Date(year, 11, 31, 23, 59, 59); // December 31st of the year

  switch (period) {
    case 'today':
      // Last day of the year
      return {
        start: new Date(year, 11, 31).toISOString(),
        end: new Date(year, 11, 31, 23, 59, 59).toISOString()
      };
    case 'week':
      // Last week of the year
      const lastWeekStart = new Date(year, 11, 25);
      return {
        start: lastWeekStart.toISOString(),
        end: end.toISOString()
      };
    case 'month':
      // December of the year
      return {
        start: new Date(year, 11, 1).toISOString(),
        end: end.toISOString()
      };
    case 'year':
      // Entire year
      return {
        start: start.toISOString(),
        end: end.toISOString()
      };
    default:
      return { start: start.toISOString(), end: end.toISOString() };
  }
}
