import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const beehiivApiKey = Deno.env.get('BEEHIIV_API_KEY');
    const beehiivPubId = Deno.env.get('BEEHIIV_PUB_ID');
    const segmentId = Deno.env.get('BEEHIIV_DAILY_DIGEST_SEGMENT_ID');

    if (!beehiivApiKey || !beehiivPubId) {
      throw new Error('Beehiiv configuration is missing');
    }
    if (!segmentId) {
      throw new Error('BEEHIIV_DAILY_DIGEST_SEGMENT_ID is not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Yesterday in UTC
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

    // Vote counts (separate query — views can't embed)
    const productIds = products.map((p) => p.id);
    const { data: votes } = await supabase
      .from('votes')
      .select('product_id')
      .in('product_id', productIds);

    const voteMap = new Map<string, number>();
    votes?.forEach((v) => {
      voteMap.set(v.product_id, (voteMap.get(v.product_id) || 0) + 1);
    });

    // Top 5
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

    // Build HTML using string concatenation (no multiline templates)
    let itemsHtml = '';
    top5.forEach((p, i) => {
      const url = PRODUCTION_URL + '/launch/' + escapeHtml(p.slug);
      const name = escapeHtml(p.name || '');
      const tagline = escapeHtml(firstSentence(p.tagline || ''));
      itemsHtml += '<tr><td style="padding:16px 0;border-bottom:1px solid #eee;">';
      itemsHtml += '<div style="font-size:13px;color:#999;margin-bottom:4px;">#' + (i + 1) + ' · ' + p.votes + ' upvotes</div>';
      itemsHtml += '<a href="' + url + '" style="font-size:18px;font-weight:600;color:#111;text-decoration:none;">' + name + '</a>';
      if (tagline) itemsHtml += '<div style="font-size:14px;color:#555;margin-top:4px;line-height:1.4;">' + tagline + '</div>';
      itemsHtml += '<a href="' + url + '" style="display:inline-block;margin-top:8px;font-size:13px;color:#2563eb;text-decoration:none;">View launch →</a>';
      itemsHtml += '</td></tr>';
    });

    let html = '<!doctype html><html><body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;">';
    html += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:24px 0;"><tr><td align="center">';
    html += '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%;padding:32px;border-radius:8px;">';
    html += '<tr><td><h1 style="font-size:22px;margin:0 0 4px;color:#111;">Top 5 launches yesterday</h1>';
    html += '<div style="font-size:14px;color:#777;margin-bottom:8px;">' + escapeHtml(dateLabel) + '</div></td></tr>';
    html += '<tr><td><table width="100%" cellpadding="0" cellspacing="0">' + itemsHtml + '</table></td></tr>';
    html += '<tr><td style="padding-top:24px;"><a href="' + PRODUCTION_URL + '" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">See all launches</a></td></tr>';
    html += '<tr><td style="padding-top:32px;font-size:12px;color:#999;">You\'re receiving this because you opted into the Launch daily digest. Manage preferences in Beehiiv.</td></tr>';
    html += '</table></td></tr></table></body></html>';

    const subject = 'Top 5 launches yesterday on Launch 🚀';
    const TEMPLATE_ID = '8ef467dd-a7af-47e8-ae7d-9d78bc592a1d'; // Launch V4

    // Create + schedule a Beehiiv post from the Launch V4 template, targeting the daily_digest segment
    const beehiivResp = await fetch(
      'https://api.beehiiv.com/v2/publications/' + beehiivPubId + '/posts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + beehiivApiKey,
        },
        body: JSON.stringify({
          template_post_id: TEMPLATE_ID,
          title: subject,
          subtitle: 'Yesterday\'s most upvoted products on Launch',
          body_content: html,
          status: 'draft',
          email_settings: {
            email_subject_line: subject,
            email_preview_text: 'The top products our community upvoted yesterday.',
          },
          audience: {
            tiers: ['free', 'premium'],
            segment_ids: [segmentId],
          },
        }),
      },
    );

    const beehiivData = await beehiivResp.json();

    if (!beehiivResp.ok) {
      console.error('Beehiiv API error:', beehiivResp.status, JSON.stringify(beehiivData));
      throw new Error('Beehiiv API error: ' + beehiivResp.status + ' - ' + JSON.stringify(beehiivData));
    }

    console.log('Daily digest sent', { count: top5.length, post: beehiivData?.data?.id });

    return new Response(
      JSON.stringify({ sent: top5.length, post: beehiivData?.data ?? null }),
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
