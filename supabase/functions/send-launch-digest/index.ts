import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- inlined cron auth (kept inline so manual dashboard deploys work) ---
function isCronAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const cronSecretHeader = req.headers.get('x-cron-secret') || req.headers.get('X-Cron-Secret') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const expectedCronSecret = Deno.env.get('CRON_SECRET') || '';
  if (serviceKey && authHeader === 'Bearer ' + serviceKey) return true;
  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) return true;
  if (expectedCronSecret && authHeader === 'Bearer ' + expectedCronSecret) return true;
  return false;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';
const FROM = 'Launch <notifications@trylaunch.ai>';
const MAX_RECIPIENTS_PER_RUN = 5000;
const BATCH_SIZE = 100;

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

function utm(url: string, campaign: string, content: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + 'utm_source=launch&utm_medium=email&utm_campaign=' + campaign + '&utm_content=' + content;
}

// ISO week key, e.g. 2026-W34
function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return date.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

interface DigestProduct {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  icon: string | null;
  category: string | null;
  votes: number;
  featured?: boolean;
}

function productRowHtml(p: DigestProduct, campaign: string, rank: number | null): string {
  const url = utm(PRODUCTION_URL + '/launch/' + encodeURIComponent(p.slug), campaign, p.featured ? 'featured' : 'product_' + rank);
  const name = escapeHtml(p.name || '');
  const tagline = escapeHtml(firstSentence(p.tagline || ''));
  const icon = p.icon
    ? '<img src="' + escapeHtml(p.icon) + '" width="48" height="48" alt="' + name + '" style="width:48px;height:48px;border-radius:10px;display:block;object-fit:cover;background:#f3f4f6;" />'
    : '<div style="width:48px;height:48px;border-radius:10px;background:#f3f4f6;"></div>';

  const meta: string[] = [];
  if (p.category) meta.push(escapeHtml(p.category));
  if (p.votes > 0) meta.push(p.votes + ' upvotes');

  let html = '';
  html += '<tr><td style="padding:16px 0;border-bottom:1px solid #eef0f3;">';
  html += '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>';
  html += '<td width="64" valign="top" style="width:64px;padding-right:16px;">' + icon + '</td>';
  html += '<td valign="top">';
  if (p.featured) {
    html += '<div style="margin-bottom:6px;"><span style="display:inline-block;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#206dcb;background:#eaf2fd;border-radius:4px;padding:2px 7px;">Featured</span></div>';
  }
  html += '<a href="' + url + '" style="font-size:16px;font-weight:600;color:#111;text-decoration:none;">' + name + '</a>';
  if (tagline) html += '<div style="font-size:14px;color:#4b5563;margin-top:3px;line-height:1.5;">' + tagline + '</div>';
  if (meta.length) html += '<div style="font-size:12px;color:#9ca3af;margin-top:6px;">' + meta.join(' &middot; ') + '</div>';
  html += '<div style="margin-top:10px;"><a href="' + url + '" style="font-size:13px;font-weight:500;color:#206dcb;text-decoration:none;">View Launch &rarr;</a></div>';
  html += '</td></tr></table>';
  html += '</td></tr>';
  return html;
}

function buildHtml(
  opts: {
    heading: string;
    subheading: string;
    products: DigestProduct[];
    featured: DigestProduct | null;
    campaign: string;
    manageUrl: string;
    unsubUrl: string;
  },
): string {
  const { heading, subheading, products, featured, campaign, manageUrl, unsubUrl } = opts;

  let items = '';
  if (featured) items += productRowHtml(featured, campaign, null);
  products.forEach((p, i) => {
    items += productRowHtml(p, campaign, i + 1);
  });

  const logoUrl = PRODUCTION_URL + '/images/email-logo.png';
  const submitUrl = utm(PRODUCTION_URL + '/submit', campaign, 'submit_cta');
  const allUrl = utm(PRODUCTION_URL, campaign, 'see_all');

  let html = '<!DOCTYPE html><html><head>';
  html += '<meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />';
  html += '<style>';
  html += 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f9fafb;}';
  html += '.container{max-width:600px;margin:0 auto;padding:40px 20px;}';
  html += '.card{background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);}';
  html += '.header{padding:28px 30px;text-align:center;border-bottom:1px solid #e5e7eb;}';
  html += '.logo{height:32px;}';
  html += '.content{padding:26px 30px 30px 30px;}';
  html += '.content h1{margin:0 0 4px 0;font-size:22px;color:#111;}';
  html += '.content .sub{margin:0 0 8px 0;font-size:14px;color:#6b7280;}';
  html += '.button{display:inline-block;background:#206dcb;color:#ffffff !important;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:500;font-size:14px;}';
  html += '.promo{margin-top:26px;padding:22px;background:#f9fafb;border-radius:8px;text-align:center;}';
  html += '.footer{padding:20px 30px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;}';
  html += '.footer a{color:#6b7280;}';
  html += '@media only screen and (max-width:600px){.container{padding:16px 10px;}.content{padding:20px 18px 24px 18px;}.header{padding:20px;}}';
  html += '</style></head><body>';
  html += '<div class="container"><div class="card">';
  html += '<div class="header"><img src="' + logoUrl + '" alt="Launch" class="logo" /></div>';
  html += '<div class="content">';
  html += '<h1>' + escapeHtml(heading) + '</h1>';
  html += '<p class="sub">' + escapeHtml(subheading) + '</p>';
  html += '<table width="100%" cellpadding="0" cellspacing="0" role="presentation">' + items + '</table>';
  html += '<p style="margin:24px 0 0 0;"><a href="' + allUrl + '" class="button" style="color:#ffffff !important;">See all launches</a></p>';
  html += '<div class="promo">';
  html += '<div style="font-size:17px;font-weight:600;color:#111;">Launching something?</div>';
  html += '<div style="font-size:14px;color:#4b5563;margin:6px 0 16px 0;">Get your product discovered by founders, builders and early adopters.</div>';
  html += '<a href="' + submitUrl + '" class="button" style="color:#ffffff !important;">Launch your product</a>';
  html += '</div>';
  html += '</div>';
  html += '<div class="footer"><p>You\'re receiving this because you chose to get New Launches emails from Launch.<br/>';
  html += '<a href="' + manageUrl + '">Manage email preferences</a> &nbsp;&middot;&nbsp; <a href="' + unsubUrl + '">Unsubscribe</a></p></div>';
  html += '</div></div></body></html>';
  return html;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isCronAuthorized(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY missing');

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }
    const type = body.type === 'weekly' ? 'weekly' : 'daily';
    const dryRun = body.dry_run === true;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ---- Period window (UTC) ----
    const now = new Date();
    const endUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startUtc = new Date(endUtc);
    startUtc.setUTCDate(startUtc.getUTCDate() - (type === 'weekly' ? 7 : 1));

    const periodKey = type === 'weekly' ? isoWeekKey(startUtc) : startUtc.toISOString().slice(0, 10);
    const campaign = type === 'weekly' ? 'weekly_digest' : 'daily_digest';
    const limit = type === 'weekly' ? 10 : 8;

    // ---- Products launched in the window ----
    const { data: rawProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name, slug, tagline, launch_date')
      .eq('status', 'launched')
      .gte('launch_date', startUtc.toISOString())
      .lt('launch_date', endUtc.toISOString())
      .limit(500);

    if (prodError) throw prodError;

    if (!rawProducts || rawProducts.length === 0) {
      console.log('No launches in window — skipping', { type, periodKey });
      return new Response(JSON.stringify({ sent: 0, reason: 'no_launches', type, period_key: periodKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const productIds = rawProducts.map((p) => p.id);

    const [votesRes, mediaRes, catMapRes, catsRes] = await Promise.all([
      supabase.from('votes').select('product_id').in('product_id', productIds).limit(50000),
      supabase.from('product_media').select('product_id, type, url').in('product_id', productIds).limit(5000),
      supabase.from('product_category_map').select('product_id, category_id').in('product_id', productIds).limit(5000),
      supabase.from('product_categories').select('id, name'),
    ]);

    const voteMap = new Map<string, number>();
    (votesRes.data || []).forEach((v: { product_id: string }) => {
      voteMap.set(v.product_id, (voteMap.get(v.product_id) || 0) + 1);
    });

    const iconMap = new Map<string, string>();
    (mediaRes.data || []).forEach((m: { product_id: string; type: string; url: string }) => {
      if (m.type === 'icon') iconMap.set(m.product_id, m.url);
      else if (m.type === 'thumbnail' && !iconMap.has(m.product_id)) iconMap.set(m.product_id, m.url);
    });

    const catNames = new Map<number, string>();
    (catsRes.data || []).forEach((c: { id: number; name: string }) => catNames.set(c.id, c.name));
    const productCategory = new Map<string, string>();
    (catMapRes.data || []).forEach((m: { product_id: string; category_id: number }) => {
      if (!productCategory.has(m.product_id)) {
        const n = catNames.get(m.category_id);
        if (n) productCategory.set(m.product_id, n);
      }
    });

    const ranked: DigestProduct[] = rawProducts
      .map((p) => ({
        id: p.id as string,
        name: p.name as string,
        slug: p.slug as string,
        tagline: (p.tagline as string) || '',
        icon: iconMap.get(p.id as string) || null,
        category: productCategory.get(p.id as string) || null,
        votes: voteMap.get(p.id as string) || 0,
      }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, limit);

    // ---- Optional single featured/sponsored slot (reuses sponsored_products) ----
    let featured: DigestProduct | null = null;
    try {
      const nowIso = new Date().toISOString();
      const { data: sponsors } = await supabase
        .from('sponsored_products')
        .select('product_id, position, sponsorship_type, start_date, end_date')
        .lte('start_date', nowIso)
        .gte('end_date', nowIso)
        .order('position', { ascending: true })
        .limit(5);

      const sponsor = (sponsors || [])[0];
      if (sponsor) {
        const { data: sp } = await supabase
          .from('products')
          .select('id, name, slug, tagline')
          .eq('id', sponsor.product_id)
          .maybeSingle();
        if (sp) {
          const { data: spMedia } = await supabase
            .from('product_media')
            .select('type, url')
            .eq('product_id', sp.id)
            .limit(20);
          const icon =
            (spMedia || []).find((m: { type: string }) => m.type === 'icon')?.url ||
            (spMedia || []).find((m: { type: string }) => m.type === 'thumbnail')?.url ||
            null;
          featured = {
            id: sp.id as string,
            name: sp.name as string,
            slug: sp.slug as string,
            tagline: (sp.tagline as string) || '',
            icon,
            category: null,
            votes: 0,
            featured: true,
          };
        }
      }
    } catch (e) {
      console.error('featured slot lookup failed (non-fatal):', e);
    }

    // Don't duplicate the featured product in the organic list.
    const organic = featured ? ranked.filter((p) => p.id !== featured!.id) : ranked;

    // ---- Recipients ----
    const { data: subscribers, error: subError } = await supabase
      .from('users')
      .select('id, digest_unsub_token')
      .eq('launch_digest_frequency', type)
      .limit(MAX_RECIPIENTS_PER_RUN);

    if (subError) throw subError;

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_subscribers', type, period_key: periodKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Already-sent for this period (dedupe)
    const { data: alreadySent } = await supabase
      .from('digest_sends')
      .select('user_id')
      .eq('digest_type', type)
      .eq('period_key', periodKey)
      .limit(50000);
    const sentSet = new Set((alreadySent || []).map((r: { user_id: string }) => r.user_id));

    const pending = subscribers.filter((u) => !sentSet.has(u.id));
    if (pending.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'already_sent', type, period_key: periodKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Emails from auth
    const emailById = new Map<string, string>();
    let page = 1;
    while (page <= 30) {
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (listErr) throw listErr;
      const users = list?.users || [];
      users.forEach((u) => {
        if (u.email) emailById.set(u.id, u.email);
      });
      if (users.length < 1000) break;
      page++;
    }

    const heading = type === 'weekly' ? 'The Best Launches This Week' : "Today's Launches";
    const subheading = 'Discover what&#39;s new on Launch.';
    const subject = type === 'weekly' ? 'The best launches this week 🚀' : "Today's new launches 🚀";
    const manageUrl = utm(PRODUCTION_URL + '/settings?tab=notifications', campaign, 'manage_prefs');

    const targets = pending
      .map((u) => ({ id: u.id as string, token: u.digest_unsub_token as string, email: emailById.get(u.id as string) }))
      .filter((t) => !!t.email);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          type,
          period_key: periodKey,
          products: organic.length,
          featured: featured ? featured.slug : null,
          recipients: targets.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const chunk = targets.slice(i, i + BATCH_SIZE);
      const payload = chunk.map((t) => {
        const unsubUrl =
          PRODUCTION_URL + '/unsubscribe?type=digest&uid=' + t.id + '&token=' + encodeURIComponent(t.token || '');
        return {
          from: FROM,
          to: [t.email as string],
          subject,
          html: buildHtml({
            heading,
            subheading: subheading.replace('&#39;', "'"),
            products: organic,
            featured,
            campaign,
            manageUrl,
            unsubUrl,
          }),
          headers: { 'List-Unsubscribe': '<' + unsubUrl + '>' },
          tags: [
            { name: 'campaign', value: campaign },
            { name: 'period', value: periodKey.replace(/[^a-zA-Z0-9_-]/g, '_') },
          ],
        };
      });

      try {
        const resp = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + resendApiKey,
          },
          body: JSON.stringify(payload),
        });
        const respData = await resp.json();

        if (!resp.ok) {
          console.error('Resend batch error:', resp.status, JSON.stringify(respData));
          failed += chunk.length;
          await supabase.from('digest_sends').upsert(
            chunk.map((t) => ({
              user_id: t.id,
              digest_type: type,
              period_key: periodKey,
              status: 'failed',
              error: 'resend_' + resp.status,
            })),
            { onConflict: 'user_id,digest_type,period_key', ignoreDuplicates: true },
          );
          continue;
        }

        const ids: string[] = Array.isArray(respData?.data)
          ? respData.data.map((d: { id?: string }) => d?.id || '')
          : [];

        await supabase.from('digest_sends').upsert(
          chunk.map((t, idx) => ({
            user_id: t.id,
            digest_type: type,
            period_key: periodKey,
            status: 'sent',
            resend_id: ids[idx] || null,
          })),
          { onConflict: 'user_id,digest_type,period_key', ignoreDuplicates: true },
        );
        sent += chunk.length;
      } catch (e) {
        // One failed batch must not stop the run.
        console.error('Batch send threw (continuing):', e);
        failed += chunk.length;
      }

      // Gentle pacing for Resend rate limits.
      if (i + BATCH_SIZE < targets.length) {
        await new Promise((r) => setTimeout(r, 700));
      }
    }

    await supabase.from('digest_events').insert({
      digest_type: type,
      period_key: periodKey,
      event_type: 'digest_run',
      metadata: { sent, failed, products: organic.length, featured: featured ? featured.id : null },
    });

    console.log('Launch digest complete', { type, periodKey, sent, failed });

    return new Response(
      JSON.stringify({ type, period_key: periodKey, sent, failed, products: organic.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('send-launch-digest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
