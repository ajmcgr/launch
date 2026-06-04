import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isCronAuthorized, unauthorizedResponse } from '../_shared/cron-auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstSentence(s: string): string {
  if (!s) return '';
  const m = s.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : s).trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders }

  if (!isCronAuthorized(req)) {
    return unauthorizedResponse(corsHeaders);
  }
);
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const audienceId = Deno.env.get('RESEND_AUDIENCE_DAILY_DIGEST_ID');

    if (!resendApiKey) throw new Error('RESEND_API_KEY missing');
    if (!audienceId) throw new Error('RESEND_AUDIENCE_DAILY_DIGEST_ID missing');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date();
    const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
    const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, slug, tagline, launch_date')
      .eq('status', 'launched')
      .gte('launch_date', startUtc.toISOString())
      .lt('launch_date', endUtc.toISOString());

    if (prodError) throw prodError;

    if (!products || products.length === 0) {
      console.log('No launches yesterday — skipping send');
      return new Response(JSON.stringify({ sent: 0, reason: 'no_launches' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productIds = products.map((p) => p.id);
    const { data: votes } = await supabase
      .from('votes')
      .select('product_id')
      .in('product_id', productIds);

    const voteMap = new Map<string, number>();
    votes?.forEach((v) => {
      voteMap.set(v.product_id, (voteMap.get(v.product_id) || 0) + 1);
    });

    const top5 = products
      .map((p) => ({ ...p, votes: voteMap.get(p.id) || 0 }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 5);

    const dateLabel = startUtc.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    let itemsHtml = '';
    top5.forEach((p, i) => {
      const url = PRODUCTION_URL + '/launch/' + escapeHtml(p.slug);
      const name = escapeHtml(p.name || '');
      const tagline = escapeHtml(firstSentence(p.tagline || ''));
      const isLast = i === top5.length - 1;
      const borderStyle = isLast ? '' : 'border-bottom:1px solid #e5e7eb;';
      itemsHtml += '<tr><td style="padding:18px 0;' + borderStyle + '">';
      itemsHtml += '<div style="font-size:13px;color:#9ca3af;margin-bottom:4px;">#' + (i + 1) + ' · ' + p.votes + ' upvotes</div>';
      itemsHtml += '<a href="' + url + '" style="font-size:17px;font-weight:600;color:#111;text-decoration:none;">' + name + '</a>';
      if (tagline) itemsHtml += '<div style="font-size:14px;color:#4b5563;margin-top:4px;line-height:1.5;">' + tagline + '</div>';
      itemsHtml += '</td></tr>';
    });

    const logoUrl = PRODUCTION_URL + '/images/email-logo.png';

    let html = '<!DOCTYPE html><html><head><style>';
    html += 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f9fafb;}';
    html += '.container{max-width:600px;margin:0 auto;padding:40px 20px;}';
    html += '.card{background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);}';
    html += '.header{padding:30px;text-align:center;border-bottom:1px solid #e5e7eb;}';
    html += '.logo{height:32px;}';
    html += '.content{padding:30px;}';
    html += '.content h1{margin:0 0 4px 0;font-size:20px;color:#111;}';
    html += '.content .date{margin:0 0 20px 0;font-size:14px;color:#6b7280;}';
    html += '.button{display:inline-block;background:#206dcb;color:#ffffff !important;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:500;font-size:14px;}';
    html += '.footer{padding:20px 30px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;}';
    html += '.footer a{color:#6b7280;}';
    html += '</style></head><body>';
    html += '<div class="container"><div class="card">';
    html += '<div class="header"><img src="' + logoUrl + '" alt="Launch" class="logo" /></div>';
    html += '<div class="content">';
    html += '<h1>Top 5 launches yesterday</h1>';
    html += '<p class="date">' + escapeHtml(dateLabel) + '</p>';
    html += '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">' + itemsHtml + '</table>';
    html += '<p style="margin:0;"><a href="' + PRODUCTION_URL + '" class="button" style="color:#ffffff !important;">See all launches</a></p>';
    html += '</div>';
    html += '<div class="footer"><p>You\'re receiving this because you\'re a member of Launch.<br/>';
    html += '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p></div>';
    html += '</div></div></body></html>';

    const subject = 'Top 5 launches yesterday on Launch 🚀';

    // 1. Create the broadcast
    const createResp = await fetch('https://api.resend.com/broadcasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + resendApiKey,
      },
      body: JSON.stringify({
        audience_id: audienceId,
        from: 'Launch <notifications@trylaunch.ai>',
        subject: subject,
        html: html,
      }),
    });

    const createData = await createResp.json();

    if (!createResp.ok) {
      console.error('Resend create broadcast error:', createResp.status, JSON.stringify(createData));
      throw new Error('Create broadcast failed: ' + createResp.status + ' - ' + JSON.stringify(createData));
    }

    const broadcastId = createData?.id;
    if (!broadcastId) throw new Error('No broadcast id returned');

    // 2. Send the broadcast immediately
    const sendResp = await fetch('https://api.resend.com/broadcasts/' + broadcastId + '/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + resendApiKey,
      },
      body: JSON.stringify({}),
    });

    const sendData = await sendResp.json();

    if (!sendResp.ok) {
      console.error('Resend send broadcast error:', sendResp.status, JSON.stringify(sendData));
      throw new Error('Send broadcast failed: ' + sendResp.status + ' - ' + JSON.stringify(sendData));
    }

    console.log('Daily digest broadcast sent', { broadcastId, top5: top5.length });

    return new Response(
      JSON.stringify({ sent: top5.length, broadcast_id: broadcastId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-daily-digest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
