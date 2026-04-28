import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = 'Alex from Launch <alex@trylaunch.ai>';

interface Recipient {
  user_id: string;
  email: string;
  first_name: string;
  startup_name: string;
}

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function bodyToHtml(body: string): string {
  return body.split('\n').map(l => {
    if (l.trim() === '') return '<div style="height:14px;"></div>';
    return '<p style="margin:0 0 14px;color:#4b5563;font-size:15px;line-height:1.6;">' + escapeHtml(l) + '</p>';
  }).join('');
}

const PRODUCTION_URL = 'https://trylaunch.ai';

function wrapEmail(inner: string, subject: string): string {
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
    + '<div class="footer"><p>Sent by <a href="' + PRODUCTION_URL + '">Launch</a> · alex@trylaunch.ai</p></div>'
    + '</div></div></body></html>';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');

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

    const { recipients, subject, body } = await req.json() as { recipients: Recipient[]; subject: string; body: string };
    if (!Array.isArray(recipients) || !recipients.length) throw new Error('No recipients');
    if (!subject?.trim() || !body?.trim()) throw new Error('Subject and body required');

    // Dedupe within 30 days
    const emails = recipients.map(r => r.email.toLowerCase());
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await admin
      .from('outreach_email_logs')
      .select('email')
      .in('email', emails)
      .gte('sent_at', cutoff)
      .eq('status', 'sent');
    const recentSet = new Set((recentLogs || []).map(l => l.email.toLowerCase()));

    // Exclude unsubscribed (suppressed_emails table from email infra, if exists) + opted-out users
    const excludedEmails = new Set<string>();
    const { data: suppressed } = await admin.from('suppressed_emails').select('email').in('email', emails).limit(1000).then(r => r).catch(() => ({ data: [] as any[] }));
    (suppressed || []).forEach((s: any) => excludedEmails.add(s.email.toLowerCase()));

    const { data: optedOut } = await admin
      .from('users')
      .select('id, email_notifications_enabled')
      .in('id', recipients.map(r => r.user_id))
      .eq('email_notifications_enabled', false);
    const optedOutIds = new Set((optedOut || []).map((u: any) => u.id));

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const logs: any[] = [];

    // Batch of 50 with small delay
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await Promise.all(batch.map(async (r) => {
        const emailLc = r.email.toLowerCase();
        if (recentSet.has(emailLc) || excludedEmails.has(emailLc) || optedOutIds.has(r.user_id)) {
          skipped++;
          return;
        }
        const vars = { first_name: r.first_name || 'there', startup_name: r.startup_name || 'your startup' };
        const renderedSubject = render(subject, vars);
        const renderedBody = render(body, vars);
        const html = wrapEmail(bodyToHtml(renderedBody), renderedSubject);
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: FROM,
              to: [r.email],
              reply_to: 'alex@trylaunch.ai',
              subject: renderedSubject,
              html,
              text: renderedBody,
            }),
          });
          if (!res.ok) {
            const errText = await res.text();
            failed++;
            logs.push({ user_id: r.user_id, email: r.email, startup_name: r.startup_name, subject: renderedSubject, status: 'failed', error: errText.slice(0, 500) });
          } else {
            sent++;
            logs.push({ user_id: r.user_id, email: r.email, startup_name: r.startup_name, subject: renderedSubject, status: 'sent' });
          }
        } catch (e) {
          failed++;
          logs.push({ user_id: r.user_id, email: r.email, startup_name: r.startup_name, subject: renderedSubject, status: 'failed', error: (e as Error).message.slice(0, 500) });
        }
      }));
      // tiny pause between batches
      if (i + batchSize < recipients.length) await new Promise(r => setTimeout(r, 500));
    }

    if (logs.length) await admin.from('outreach_email_logs').insert(logs);

    return new Response(JSON.stringify({ sent, failed, skipped }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('outreach-send-emails error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
