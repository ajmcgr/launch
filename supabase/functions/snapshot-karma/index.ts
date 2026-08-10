import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- inlined from _shared/cron-auth.ts (kept inline so manual dashboard deploys work) ---
function isCronAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const cronSecretHeader = req.headers.get('x-cron-secret') || req.headers.get('X-Cron-Secret') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const expectedCronSecret = Deno.env.get('CRON_SECRET') || '';
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) return true;
  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) return true;
  if (expectedCronSecret && authHeader === `Bearer ${expectedCronSecret}`) return true;
  return false;
}

function unauthorizedResponse(headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isCronAuthorized(req)) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all current karma scores
    const { data: karmaData, error: karmaError } = await supabase
      .from('user_karma')
      .select('user_id, karma');

    if (karmaError) throw new Error(`Failed to fetch karma: ${karmaError.message}`);
    if (!karmaData || karmaData.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No karma data to snapshot' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Upsert all karma snapshots for today
    const snapshots = karmaData.map((k: any) => ({
      user_id: k.user_id,
      karma: k.karma || 0,
      snapshot_date: today,
    }));

    const { error: upsertError } = await supabase
      .from('karma_snapshots')
      .upsert(snapshots, { onConflict: 'user_id,snapshot_date' });

    if (upsertError) throw new Error(`Failed to upsert snapshots: ${upsertError.message}`);

    console.log(`Snapshotted karma for ${snapshots.length} users on ${today}`);

    return new Response(
      JSON.stringify({ success: true, count: snapshots.length, date: today }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Karma snapshot error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
