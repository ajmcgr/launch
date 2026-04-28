import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface Candidate {
  user_id: string;
  product_id: string;
  email: string;
  name: string | null;
  username: string;
  plan: string | null;
  product_name: string | null;
  tagline: string | null;
  description: string | null;
  domain_url: string | null;
  launch_date: string | null;
  status: string | null;
  vote_count: number;
  launch_count: number;
}

async function scoreOne(c: Candidate): Promise<{ score: number; reason: string; funding_status: string; funding_confidence: number; funding_evidence: string }> {
  const prompt = `You are evaluating a startup that launched on a Product-Hunt-style site for two things:
1) Lead quality (0-10) — likelihood they'd PAY for growth help (PR, influencer marketing, community growth, post-launch traction). Higher for: B2B SaaS / AI tools / dev tools, polished commercial product, recently launched, paid plan, multiple launches, active. Lower for: side projects, free tools, hobby apps, no clear monetization.
2) Funding status — best inference from public signals (Crunchbase visibility, VC mention, investor logos, "backed by", YC/accelerator badges, your general knowledge of the company). Categories: "VC Backed", "Angel Backed", "Bootstrapped", "Unknown". Confidence 0-100.

Startup data:
- Name: ${c.product_name ?? 'unknown'}
- Tagline: ${c.tagline ?? ''}
- Description: ${(c.description ?? '').slice(0, 600)}
- Website: ${c.domain_url ?? 'none'}
- Launch date: ${c.launch_date ?? 'unknown'}
- Status: ${c.status ?? ''}
- Founder name: ${c.name ?? c.username}
- Founder plan on Launch: ${c.plan ?? 'free'}
- Total launches by founder: ${c.launch_count}
- Upvotes on this product: ${c.vote_count}

Return ONLY JSON with this exact shape:
{"score": <0-10 int>, "reason": "<one short sentence, max 18 words>", "funding_status": "<one of the 4>", "funding_confidence": <0-100 int>, "funding_evidence": "<one short sentence, max 18 words>"}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const parsed = JSON.parse(j.choices[0].message.content);
  return {
    score: Math.max(0, Math.min(10, parseInt(parsed.score) || 0)),
    reason: String(parsed.reason || '').slice(0, 280),
    funding_status: ['VC Backed', 'Angel Backed', 'Bootstrapped', 'Unknown'].includes(parsed.funding_status) ? parsed.funding_status : 'Unknown',
    funding_confidence: Math.max(0, Math.min(100, parseInt(parsed.funding_confidence) || 0)),
    funding_evidence: String(parsed.funding_evidence || '').slice(0, 280),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');

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

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(50, Math.max(1, parseInt(body.limit) || 25));
    const onlyMissing = body.onlyMissing !== false;

    // Pull launched products, prefer recent + with tagline
    const { data: products, error: productsErr } = await admin
      .from('products')
      .select('id, owner_id, name, slug, tagline, description, domain_url, launch_date, status')
      .eq('status', 'launched')
      .not('owner_id', 'is', null)
      .order('launch_date', { ascending: false, nullsFirst: false })
      .limit(500);

    console.log('[outreach-score] products query:', { count: products?.length, error: productsErr?.message });

    if (!products?.length) {
      // Diagnostic: check what statuses exist
      const { data: anyProducts } = await admin.from('products').select('status, owner_id').limit(20);
      console.log('[outreach-score] sample products:', anyProducts);
      return new Response(JSON.stringify({ scored: 0, debug: 'no products matched status=launched with owner_id', sample: anyProducts }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ownerIds = [...new Set(products.map(p => p.owner_id))];
    const productIds = products.map(p => p.id);

    const [{ data: usersData }, { data: votes }, { data: existing }] = await Promise.all([
      admin.from('users').select('id, username, name, plan').in('id', ownerIds),
      admin.from('votes').select('product_id').in('product_id', productIds),
      admin.from('outreach_lead_scores').select('user_id, scored_at').in('user_id', ownerIds),
    ]);

    const userMap = new Map((usersData || []).map(u => [u.id, u]));
    const voteMap = new Map<string, number>();
    (votes || []).forEach(v => voteMap.set(v.product_id, (voteMap.get(v.product_id) || 0) + 1));
    const launchCount = new Map<string, number>();
    products.forEach(p => launchCount.set(p.owner_id, (launchCount.get(p.owner_id) || 0) + 1));
    const scoredRecently = new Set(
      (existing || [])
        .filter(e => Date.now() - new Date(e.scored_at).getTime() < 1000 * 60 * 60 * 24 * 30)
        .map(e => e.user_id),
    );

    // Pick best product per owner (most votes)
    const bestPerOwner = new Map<string, typeof products[0]>();
    for (const p of products) {
      const cur = bestPerOwner.get(p.owner_id);
      if (!cur || (voteMap.get(p.id) || 0) > (voteMap.get(cur.id) || 0)) bestPerOwner.set(p.owner_id, p);
    }

    // Get auth emails
    const ownerIdList = [...bestPerOwner.keys()];
    const emailMap = new Map<string, string>();
    const pageSize = 1000;
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
      if (error || !data?.users?.length) break;
      data.users.forEach(u => { if (u.email) emailMap.set(u.id, u.email); });
      if (data.users.length < pageSize) break;
    }

    const candidates: Candidate[] = [];
    for (const [ownerId, p] of bestPerOwner) {
      if (onlyMissing && scoredRecently.has(ownerId)) continue;
      const u = userMap.get(ownerId);
      const email = emailMap.get(ownerId);
      if (!email || !u) continue;
      candidates.push({
        user_id: ownerId,
        product_id: p.id,
        email,
        name: u.name,
        username: u.username,
        plan: u.plan,
        product_name: p.name,
        tagline: p.tagline,
        description: p.description,
        domain_url: p.domain_url,
        launch_date: p.launch_date,
        status: p.status,
        vote_count: voteMap.get(p.id) || 0,
        launch_count: launchCount.get(ownerId) || 1,
      });
    }

    // Score in small parallel batches
    const toScore = candidates.slice(0, limit);
    let scored = 0;
    const concurrency = 5;
    for (let i = 0; i < toScore.length; i += concurrency) {
      const chunk = toScore.slice(i, i + concurrency);
      const results = await Promise.allSettled(chunk.map(c => scoreOne(c)));
      const rows = results
        .map((r, idx) => r.status === 'fulfilled' ? { c: chunk[idx], r: r.value } : null)
        .filter(Boolean) as { c: Candidate; r: Awaited<ReturnType<typeof scoreOne>> }[];
      if (rows.length) {
        await admin.from('outreach_lead_scores').upsert(rows.map(({ c, r }) => ({
          user_id: c.user_id,
          product_id: c.product_id,
          score: r.score,
          reason: r.reason,
          funding_status: r.funding_status,
          funding_confidence: r.funding_confidence,
          funding_evidence: r.funding_evidence,
          scored_at: new Date().toISOString(),
        })), { onConflict: 'user_id' });
        scored += rows.length;
      }
    }

    return new Response(JSON.stringify({ scored, candidates_total: candidates.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('outreach-score-leads error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
