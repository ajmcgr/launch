import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Returns enriched lead rows from outreach_lead_scores joined with product/user/email data.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const userClient = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: scores } = await admin
      .from('outreach_lead_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(500);

    if (!scores?.length) return new Response(JSON.stringify({ leads: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const userIds = scores.map(s => s.user_id);
    const productIds = scores.map(s => s.product_id).filter(Boolean) as string[];

    const [{ data: usersData }, { data: products }] = await Promise.all([
      admin.from('users').select('id, username, name, plan').in('id', userIds),
      admin.from('products').select('id, name, slug, tagline, launch_date, domain_url').in('id', productIds),
    ]);

    const userMap = new Map((usersData || []).map((u: any) => [u.id, u]));
    const productMap = new Map((products || []).map((p: any) => [p.id, p]));

    // Get emails
    const emailMap = new Map<string, string>();
    const pageSize = 1000;
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
      if (error || !data?.users?.length) break;
      data.users.forEach(u => { if (u.email && userIds.includes(u.id)) emailMap.set(u.id, u.email); });
      if (data.users.length < pageSize) break;
    }

    // sent today
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await admin
      .from('outreach_email_logs')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', todayStart.toISOString())
      .eq('status', 'sent');

    // last sent timestamp per user_id (any sent log)
    const { data: sentLogs } = await admin
      .from('outreach_email_logs')
      .select('user_id, sent_at')
      .in('user_id', userIds)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false });
    const lastSentMap = new Map<string, string>();
    (sentLogs || []).forEach((l: any) => {
      if (!lastSentMap.has(l.user_id)) lastSentMap.set(l.user_id, l.sent_at);
    });

    const leads = scores.map(s => {
      const u = userMap.get(s.user_id) as any;
      const p = s.product_id ? productMap.get(s.product_id) as any : null;
      return {
        user_id: s.user_id,
        product_id: s.product_id,
        email: emailMap.get(s.user_id) || null,
        founder_name: u?.name || u?.username || null,
        username: u?.username || null,
        plan: u?.plan || 'free',
        startup_name: p?.name || null,
        slug: p?.slug || null,
        tagline: p?.tagline || null,
        domain_url: p?.domain_url || null,
        launch_date: p?.launch_date || null,
        score: s.score,
        reason: s.reason,
        funding_status: s.funding_status,
        funding_confidence: s.funding_confidence,
        funding_evidence: s.funding_evidence,
        scored_at: s.scored_at,
        last_emailed_at: lastSentMap.get(s.user_id) || null,
      };
    }).filter(l => l.email);

    return new Response(JSON.stringify({ leads, sent_today: sentToday || 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
