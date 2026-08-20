import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uid, token } = await req.json();

    if (!uid || !token || typeof uid !== 'string' || typeof token !== 'string' || !UUID_RE.test(uid) || !UUID_RE.test(token)) {
      return new Response(JSON.stringify({ error: 'Invalid unsubscribe link' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: user } = await supabase
      .from('users')
      .select('id, digest_unsub_token, launch_digest_frequency')
      .eq('id', uid)
      .maybeSingle();

    if (!user || user.digest_unsub_token !== token) {
      return new Response(JSON.stringify({ error: 'Invalid unsubscribe link' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only turns off the New Launches digest. Transactional/account emails untouched.
    const { error: updErr } = await supabase
      .from('users')
      .update({ launch_digest_frequency: 'off' })
      .eq('id', uid);

    if (updErr) throw updErr;

    await supabase.from('digest_events').insert({
      digest_type: user.launch_digest_frequency || 'unknown',
      event_type: 'unsubscribe',
      user_id: uid,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('digest-unsubscribe error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
