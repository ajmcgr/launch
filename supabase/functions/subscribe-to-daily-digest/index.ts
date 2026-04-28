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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const audienceId = Deno.env.get('RESEND_AUDIENCE_DAILY_DIGEST_ID');

    if (!resendApiKey) throw new Error('RESEND_API_KEY missing');
    if (!audienceId) throw new Error('RESEND_AUDIENCE_DAILY_DIGEST_ID missing');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user || !user.email) throw new Error('Not authenticated or no email');

    // Get name from profile (optional)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: profile } = await admin
      .from('profiles')
      .select('username, full_name')
      .eq('id', user.id)
      .maybeSingle();

    const fullName = (profile?.full_name as string) || (profile?.username as string) || '';
    const [first, ...rest] = fullName.split(' ');

    const resp = await fetch(
      'https://api.resend.com/audiences/' + audienceId + '/contacts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + resendApiKey,
        },
        body: JSON.stringify({
          email: user.email,
          first_name: first || '',
          last_name: rest.join(' ') || '',
          unsubscribed: false,
        }),
      },
    );

    const data = await resp.json();

    // Resend returns 200 even if the contact already exists; only log non-2xx
    if (!resp.ok) {
      console.error('Resend audience add error:', resp.status, JSON.stringify(data));
      // Don't throw on duplicate — just return success
      if (resp.status === 422 || resp.status === 409) {
        return new Response(JSON.stringify({ already_subscribed: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Resend error: ' + resp.status + ' - ' + JSON.stringify(data));
    }

    return new Response(JSON.stringify({ success: true, contact: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('subscribe-to-daily-digest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
