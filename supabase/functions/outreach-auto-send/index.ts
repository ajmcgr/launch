// Daily automated outreach: scores fresh candidates then sends to top N.
// Designed to be called by pg_cron. Conservative defaults to protect sender reputation.
// Override per-call via JSON body: { dailyCap?: number, minScore?: number, scoreLimit?: number, dryRun?: boolean }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = 'Alex from Launch <alex@trylaunch.ai>';
const PRODUCTION_URL = 'https://trylaunch.ai';

const DEFAULT_SUBJECT = 'Need help after launching?';
const DEFAULT_BODY = 'Hey {{first_name}},\n\nLaunching is only step one.\n\nMany startups get attention for a few days, then momentum fades.\n\nWe\'re opening a small number of support slots for Launch startups who want help with:\n\n• Public relations\n• Influencer marketing\n• Community growth\n• More users after launch\n\nReply interested if you\'d like details.\n\n– Alex\nLaunch';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function render(t: string, v: Record<string, string>): string {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => v[k] ?? '');
}
function bodyToHtml(body: string): string {
  return body.split('\n').map(l => {
    if (l.trim() === '') return '<div style="height:14px;"></div>';
    return '<p style="margin:0 0 14px;color:#4b5563;font-size:15px;line-height:1.6;">' + escapeHtml(l) + '</p>';
  }).join('');
}
function wrapEmail(inner: string, subject: string, unsubUrl: string): string {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>' + escapeHtml(subject) + '</title>'
    + '<style>'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f9fafb;}'
    + '.container{max-width:600px;margin:0 auto;padding:40px 20px;}'
    + '.card{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);}'
    + '.header{padding:24px 30px;text-align:center;border-bottom:1px solid #e5e7eb;}'
    + '.logo{height:28px;}'
    + '.content{padding:30px;}'
    + '.footer{padding:20px 30px;text-align:center;color:#9ca3af;font-size:12px;}'
    + '.footer a{color:#9ca3af;}'
    + '</style></head><body>'
    + '<div class="container"><div class="card">'
    + '<div class="header"><img src="' + PRODUCTION_URL + '/images/launch-logo.png" alt="Launch" class="logo"/></div>'
    + '<div class="content">' + inner + '</div>'
    + '<div class="footer"><p>Sent by <a href="' + PRODUCTION_URL + '">Launch</a> · alex@trylaunch.ai</p>'
    + '<p style="margin-top:8px;">Not interested? <a href="' + unsubUrl + '">Unsubscribe</a></p></div>'
    + '</div></div></body></html>';
}

interface ScoreResult { score: number; reason: string; funding_status: string; funding_confidence: number; funding_evidence: string; }

async function scoreOne(p: any, openaiKey: string): Promise<ScoreResult | null> {
  const prompt = 'Score this startup 0-10 for likelihood of needing/buying post-launch growth services (PR, influencer marketing, community growth). Higher = more likely to pay. Also detect funding status from public signals.\n\nStartup: ' + (p.name || '') + '\nTagline: ' + (p.tagline || '') + '\nDescription: ' + ((p.description || '').slice(0, 500)) + '\nDomain: ' + (p.domain_url || '') + '\n\nReturn JSON: {"score": 0-10, "reason": "<1 sentence>", "funding_status": "VC Backed"|"Bootstrapped"|"Unknown", "funding_confidence": 0-100, "funding_evidence": "<short>"}';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const parsed = JSON.parse(j.choices?.[0]?.message?.content || '{}');
    return {
      score: Number(parsed.score) || 0,
      reason: String(parsed.reason || ''),
      funding_status: String(parsed.funding_status || 'Unknown'),
      funding_confidence: Number(parsed.funding_confidence) || 0,
      funding_evidence: String(parsed.funding_evidence || ''),
    };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OPENAI_API_KEY missing');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceKey);

    let opts: any = {};
    try { opts = await req.json(); } catch { /* empty body */ }
    const dailyCap = Math.max(1, Math.min(50, Number(opts.dailyCap) || 25));
    const minScore = Number(opts.minScore ?? 7);
    const scoreLimit = Math.max(10, Math.min(200, Number(opts.scoreLimit) || 50));
    const dryRun = !!opts.dryRun;

    // ---- 1. SCORE: pull launched products, find owners not yet scored ----
    const { data: products } = await admin
      .from('products')
      .select('id, name, tagline, description, domain_url, owner_id, launch_date')
      .eq('status', 'launched')
      .order('launch_date', { ascending: false })
      .limit(500);

    const ownerIds = [...new Set((products || []).map(p => p.owner_id).filter(Boolean))];
    if (!ownerIds.length) {
      return new Response(JSON.stringify({ scored: 0, sent: 0, message: 'no launched products' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // already-scored owner_ids (any time)
    const { data: existingScores } = await admin
      .from('outreach_lead_scores').select('user_id').in('user_id', ownerIds);
    const scoredSet = new Set((existingScores || []).map((s: any) => s.user_id));

    // best (most recent) product per owner
    const bestPerOwner = new Map<string, any>();
    for (const p of products || []) {
      if (scoredSet.has(p.owner_id)) continue;
      if (!bestPerOwner.has(p.owner_id)) bestPerOwner.set(p.owner_id, p);
    }
    const toScoreList = [...bestPerOwner.values()].slice(0, scoreLimit);

    let scored = 0;
    if (toScoreList.length && !dryRun) {
      // concurrency 5
      const inserts: any[] = [];
      for (let i = 0; i < toScoreList.length; i += 5) {
        const chunk = toScoreList.slice(i, i + 5);
        const results = await Promise.all(chunk.map(p => scoreOne(p, openaiKey)));
        chunk.forEach((p, idx) => {
          const r = results[idx];
          if (!r) return;
          inserts.push({
            user_id: p.owner_id,
            product_id: p.id,
            score: r.score,
            reason: r.reason,
            funding_status: r.funding_status,
            funding_confidence: r.funding_confidence,
            funding_evidence: r.funding_evidence,
            scored_at: new Date().toISOString(),
          });
        });
      }
      if (inserts.length) {
        const { error: upErr } = await admin.from('outreach_lead_scores')
          .upsert(inserts, { onConflict: 'user_id' });
        if (upErr) console.error('[outreach-auto] upsert error', upErr);
        else scored = inserts.length;
      }
    }

    // ---- 2. SEND: pick top N qualified, never-emailed, non-suppressed ----
    const { data: candidates } = await admin
      .from('outreach_lead_scores')
      .select('user_id, product_id, score, reason')
      .gte('score', minScore)
      .order('score', { ascending: false })
      .limit(200);
    const candidateUserIds = (candidates || []).map(c => c.user_id);
    if (!candidateUserIds.length) {
      return new Response(JSON.stringify({ scored, sent: 0, message: 'no qualified candidates' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // already-emailed (any time)
    const { data: emailedLogs } = await admin
      .from('outreach_email_logs').select('user_id').in('user_id', candidateUserIds).eq('status', 'sent');
    const emailedSet = new Set((emailedLogs || []).map((l: any) => l.user_id));

    // opted out
    const { data: optedOut } = await admin
      .from('users').select('id').in('id', candidateUserIds).eq('email_notifications_enabled', false);
    const optedOutSet = new Set((optedOut || []).map((u: any) => u.id));

    // emails via auth admin
    const emailMap = new Map<string, string>();
    const pageSize = 1000;
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
      if (error || !data?.users?.length) break;
      data.users.forEach(u => { if (u.email && candidateUserIds.includes(u.id)) emailMap.set(u.id, u.email); });
      if (data.users.length < pageSize) break;
    }

    // user/product profile data
    const productIds = (candidates || []).map(c => c.product_id).filter(Boolean) as string[];
    const [{ data: usersData }, { data: prodData }, { data: suppressed }] = await Promise.all([
      admin.from('users').select('id, name, username').in('id', candidateUserIds),
      admin.from('products').select('id, name').in('id', productIds),
      admin.from('suppressed_emails').select('email').in('email', [...emailMap.values()].map(e => e.toLowerCase())).then(r => r).catch(() => ({ data: [] as any[] })),
    ]);
    const userMap = new Map((usersData || []).map((u: any) => [u.id, u]));
    const prodMap = new Map((prodData || []).map((p: any) => [p.id, p]));
    const suppressedSet = new Set((suppressed || []).map((s: any) => (s.email || '').toLowerCase()));

    // build send queue
    const queue: any[] = [];
    for (const c of candidates || []) {
      if (queue.length >= dailyCap) break;
      if (emailedSet.has(c.user_id)) continue;
      if (optedOutSet.has(c.user_id)) continue;
      const email = emailMap.get(c.user_id);
      if (!email) continue;
      if (suppressedSet.has(email.toLowerCase())) continue;
      const u = userMap.get(c.user_id) as any;
      const p = c.product_id ? prodMap.get(c.product_id) as any : null;
      const firstName = ((u?.name || u?.username || email.split('@')[0]) + '').split(' ')[0];
      queue.push({
        user_id: c.user_id,
        email,
        first_name: firstName,
        startup_name: p?.name || 'your startup',
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({ scored, would_send: queue.length, queue: queue.map(q => q.email) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let sent = 0, failed = 0;
    const logs: any[] = [];
    for (const r of queue) {
      const vars = { first_name: r.first_name || 'there', startup_name: r.startup_name || 'your startup' };
      const subject = render(DEFAULT_SUBJECT, vars);
      const text = render(DEFAULT_BODY, vars);
      const unsubUrl = PRODUCTION_URL + '/unsubscribe?email=' + encodeURIComponent(r.email);
      const html = wrapEmail(bodyToHtml(text) + '<p style="margin-top:24px;color:#9ca3af;font-size:12px;">If you\'d rather not hear from us, <a href="' + unsubUrl + '" style="color:#9ca3af;">unsubscribe here</a>.</p>', subject, unsubUrl);
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND_API_KEY },
          body: JSON.stringify({
            from: FROM,
            to: [r.email],
            reply_to: 'alex@trylaunch.ai',
            subject,
            html,
            text: text + '\n\n---\nUnsubscribe: ' + unsubUrl,
            headers: {
              'List-Unsubscribe': '<' + unsubUrl + '>, <mailto:alex@trylaunch.ai?subject=unsubscribe>',
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          failed++;
          logs.push({ user_id: r.user_id, email: r.email, startup_name: r.startup_name, subject, status: 'failed', error: errText.slice(0, 500) });
        } else {
          sent++;
          logs.push({ user_id: r.user_id, email: r.email, startup_name: r.startup_name, subject, status: 'sent' });
        }
      } catch (e) {
        failed++;
        logs.push({ user_id: r.user_id, email: r.email, startup_name: r.startup_name, subject, status: 'failed', error: (e as Error).message.slice(0, 500) });
      }
      // 400ms pacing between sends to avoid bursts
      await new Promise(r => setTimeout(r, 400));
    }
    if (logs.length) await admin.from('outreach_email_logs').insert(logs);

    console.log('[outreach-auto] result', { scored, sent, failed, queued: queue.length });

    return new Response(JSON.stringify({ scored, sent, failed, queued: queue.length, source: 'auto' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('outreach-auto-send error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
