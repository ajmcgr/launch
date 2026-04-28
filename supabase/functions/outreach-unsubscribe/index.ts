// Public unsubscribe endpoint. Adds email to suppressed_emails.
// Supports both GET (browser link click) and POST (List-Unsubscribe one-click).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let email = url.searchParams.get('email') || '';
    if (!email && req.method === 'POST') {
      try {
        const body = await req.json();
        email = body.email || '';
      } catch {
        try {
          const form = await req.formData();
          email = (form.get('email') || '') as string;
        } catch { /* noop */ }
      }
    }
    email = email.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
      return new Response(JSON.stringify({ error: 'invalid email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceKey);

    // Insert into suppressed_emails — scoped to OUTREACH only.
    // This blocks future cold outreach but does NOT touch:
    //   - in-app notifications (email_notifications_enabled / notify_on_*)
    //   - weekly newsletter (Beehiiv) — manage via Beehiiv unsub link
    //   - daily digest (Resend audience) — manage via Resend unsub link
    // The outreach-send-emails function checks suppressed_emails before sending.
    const { error: supErr } = await admin
      .from('suppressed_emails')
      .upsert({ email, reason: 'unsubscribed', source: 'outreach' }, { onConflict: 'email' });
    if (supErr) console.error('[unsub] suppress err', supErr);

    return new Response(JSON.stringify({ ok: true, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('outreach-unsubscribe error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
