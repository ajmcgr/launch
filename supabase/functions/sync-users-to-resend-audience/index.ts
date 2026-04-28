import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const audienceId = Deno.env.get('RESEND_AUDIENCE_DAILY_DIGEST_ID');

    if (!resendApiKey) throw new Error('RESEND_API_KEY missing');
    if (!audienceId) throw new Error('RESEND_AUDIENCE_DAILY_DIGEST_ID missing');

    // Verify admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: isAdmin } = await userClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (!isAdmin) throw new Error('Admin access required');

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Page through all auth users
    let added = 0;
    let skipped = 0;
    let errors = 0;
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      if (!list?.users || list.users.length === 0) break;

      // Get profiles for names
      const ids = list.users.map((u) => u.id);
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, username, full_name')
        .in('id', ids);
      const profileMap = new Map<string, any>();
      profiles?.forEach((p: any) => profileMap.set(p.id, p));

      for (const u of list.users) {
        if (!u.email) { skipped++; continue; }
        const p = profileMap.get(u.id);
        const fullName = (p?.full_name as string) || (p?.username as string) || '';
        const [first, ...rest] = fullName.split(' ');

        try {
          const resp = await fetch(
            'https://api.resend.com/audiences/' + audienceId + '/contacts',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + resendApiKey,
              },
              body: JSON.stringify({
                email: u.email,
                first_name: first || '',
                last_name: rest.join(' ') || '',
                unsubscribed: false,
              }),
            },
          );
          if (resp.ok) added++;
          else if (resp.status === 422 || resp.status === 409) skipped++;
          else { errors++; console.error('add failed', u.email, resp.status, await resp.text()); }
        } catch (e) {
          errors++;
          console.error('add exception', u.email, e);
        }

        // Throttle: Resend ~10 req/s
        await new Promise((r) => setTimeout(r, 110));
      }

      if (list.users.length < perPage) break;
      page++;
    }

    return new Response(JSON.stringify({ added, skipped, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync-users-to-resend-audience error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
