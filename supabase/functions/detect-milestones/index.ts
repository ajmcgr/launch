// Founder Milestone System — detection + email
// Deploy MANUALLY via Supabase dashboard (per project convention).
// Suggested schedule: hourly via pg_cron.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';

interface MilestoneSpec {
  type: string;
  title: string;
  emoji: string;
  emailSubject: string;
}

const SPECS: Record<string, MilestoneSpec> = {
  trending_1:        { type: 'trending_1',        title: '#1 Trending',            emoji: '🥇', emailSubject: "🥇 You hit #1 Trending on Launch" },
  trending_top_10:   { type: 'trending_top_10',   title: 'Top 10 Trending',        emoji: '🔥', emailSubject: "🔥 You broke into the Top 10 on Launch" },
  homepage_trending: { type: 'homepage_trending', title: 'Reached Homepage Trending', emoji: '🏠', emailSubject: "📈 Your product is on the Launch homepage" },
  featured:          { type: 'featured',          title: 'Featured Product',       emoji: '⭐', emailSubject: "⭐ Your product was Featured on Launch" },
  most_saved:        { type: 'most_saved',        title: 'Most Saved Product',     emoji: '🔖', emailSubject: "🔥 You're one of the Most Saved Products this week" },
  fastest_rising:    { type: 'fastest_rising',    title: 'Fastest Rising Product', emoji: '🚀', emailSubject: "🚀 You're the Fastest Rising product on Launch" },
  popular_week:      { type: 'popular_week',      title: 'Popular This Week',      emoji: '📈', emailSubject: "📈 Your product is Popular This Week on Launch" },
  collections_100:   { type: 'collections_100',   title: 'Added to 100 Collections', emoji: '📚', emailSubject: "📚 Your product was added to 100+ collections" },
  clicks_100:        { type: 'clicks_100',        title: '100 Clicks',             emoji: '👆', emailSubject: "🎉 Your product just hit 100 clicks on Launch" },
  clicks_500:        { type: 'clicks_500',        title: '500 Clicks',             emoji: '⚡', emailSubject: "⚡ 500 visitors and counting" },
  clicks_1000:       { type: 'clicks_1000',       title: '1,000 Clicks',           emoji: '🚀', emailSubject: "🚀 Your product just hit 1,000 clicks on Launch" },
  clicks_5000:       { type: 'clicks_5000',       title: '5,000 Clicks',           emoji: '💥', emailSubject: "💥 5,000 clicks from Launch" },
  impressions_10000: { type: 'impressions_10000', title: '10,000 Impressions',     emoji: '👀', emailSubject: "👀 Your product hit 10,000 impressions" },
};

const CLICK_TIERS = [
  { type: 'clicks_100',  threshold: 100 },
  { type: 'clicks_500',  threshold: 500 },
  { type: 'clicks_1000', threshold: 1000 },
  { type: 'clicks_5000', threshold: 5000 },
];

function buildEmail(args: {
  productName: string;
  productSlug: string;
  spec: MilestoneSpec;
  metricLabel: string;
  achievementId: string;
  founderName?: string | null;
}): string {
  const productUrl = PRODUCTION_URL + '/launch/' + args.productSlug;
  const analyticsUrl = PRODUCTION_URL + '/launch/' + args.productSlug + '/analytics';
  const shareUrl = PRODUCTION_URL + '/achievement/' + args.achievementId;
  const greeting = args.founderName ? ('Hey ' + args.founderName + ',') : 'Hey,';

  return ''
    + '<!DOCTYPE html><html><head><style>'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f9fafb;margin:0;padding:0;color:#111}'
    + '.container{max-width:600px;margin:0 auto;padding:40px 20px}'
    + '.card{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow:hidden}'
    + '.header{background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:36px 30px;text-align:center;color:#fff}'
    + '.emoji{font-size:48px;line-height:1;margin-bottom:8px}'
    + '.headline{font-size:22px;font-weight:700;margin:6px 0 0}'
    + '.subhead{font-size:14px;opacity:.85;margin-top:6px}'
    + '.content{padding:28px 30px;font-size:15px;line-height:1.55;color:#374151}'
    + '.metric{background:#f3f4f6;border-radius:10px;padding:18px;text-align:center;margin:18px 0}'
    + '.metric .v{font-size:24px;font-weight:700;color:#111}'
    + '.metric .l{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-top:4px}'
    + '.btn{display:inline-block;background:#111;color:#fff !important;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px}'
    + '.btn-outline{background:#fff;color:#111 !important;border:1px solid #d1d5db}'
    + '.actions{text-align:center;margin:20px 0}'
    + '.footer{padding:18px 30px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6}'
    + '</style></head><body>'
    + '<div class="container"><div class="card">'
    + '<div class="header">'
    + '<div class="emoji">' + args.spec.emoji + '</div>'
    + '<div class="headline">' + args.spec.title + '</div>'
    + '<div class="subhead">' + args.productName + ' on Launch</div>'
    + '</div>'
    + '<div class="content">'
    + '<p>' + greeting + '</p>'
    + '<p>Big news — <strong>' + args.productName + '</strong> just unlocked a new milestone on Launch.</p>'
    + '<div class="metric"><div class="v">' + args.metricLabel + '</div><div class="l">' + args.spec.title + '</div></div>'
    + '<p>This is real momentum. Sharing it publicly is one of the highest-leverage things you can do right now — every share brings new visitors, votes, and signups.</p>'
    + '<div class="actions">'
    + '<a class="btn" href="' + shareUrl + '">Share this milestone</a>'
    + '<a class="btn btn-outline" href="' + analyticsUrl + '">View analytics</a>'
    + '<a class="btn btn-outline" href="' + productUrl + '">Product page</a>'
    + '</div>'
    + '<p style="color:#6b7280;font-size:13px">Keep going — bigger milestones are waiting.</p>'
    + '<p style="margin-top:24px">— The Launch team</p>'
    + '</div>'
    + '<div class="footer">You\'re receiving this because you launched on Launch. <a href="' + PRODUCTION_URL + '/unsubscribe" style="color:#6b7280">Unsubscribe</a></div>'
    + '</div></div></body></html>';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Load all launched products
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, slug, owner_id, featured')
      .eq('status', 'launched');
    if (prodErr) throw prodErr;
    if (!products?.length) {
      return new Response(JSON.stringify({ awarded: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const productIds = products.map((p) => p.id);

    // Existing achievements lookup
    const { data: existing } = await supabase
      .from('product_achievements')
      .select('product_id, achievement_type')
      .in('product_id', productIds);
    const existingSet = new Set((existing || []).map((e: any) => e.product_id + ':' + e.achievement_type));
    const has = (pid: string, type: string) => existingSet.has(pid + ':' + type);

    // ---- Aggregate metrics ----
    // Clicks (from product_analytics event_type 'redirect_click' or 'click')
    const { data: clickRows } = await supabase
      .from('product_analytics')
      .select('product_id, event_type')
      .in('product_id', productIds)
      .in('event_type', ['redirect_click', 'click', 'outbound_click']);
    const clickMap = new Map<string, number>();
    (clickRows || []).forEach((r: any) => clickMap.set(r.product_id, (clickMap.get(r.product_id) || 0) + 1));

    // Impressions (page_view)
    const { data: viewRows } = await supabase
      .from('product_analytics')
      .select('product_id')
      .in('product_id', productIds)
      .eq('event_type', 'page_view');
    const viewMap = new Map<string, number>();
    (viewRows || []).forEach((r: any) => viewMap.set(r.product_id, (viewMap.get(r.product_id) || 0) + 1));

    // Collections counts
    const { data: collRows } = await supabase
      .from('user_collection_items')
      .select('product_id')
      .in('product_id', productIds);
    const collMap = new Map<string, number>();
    (collRows || []).forEach((r: any) => collMap.set(r.product_id, (collMap.get(r.product_id) || 0) + 1));

    // Saves last 7d (using same table, filtered by created_at if present)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: savesWeek } = await supabase
      .from('user_collection_items')
      .select('product_id, added_at')
      .in('product_id', productIds)
      .gte('added_at', weekAgo);
    const saveWeekMap = new Map<string, number>();
    (savesWeek || []).forEach((r: any) => saveWeekMap.set(r.product_id, (saveWeekMap.get(r.product_id) || 0) + 1));

    // Votes last 7d for popular_week
    const { data: votesWeek } = await supabase
      .from('votes')
      .select('product_id, created_at')
      .in('product_id', productIds)
      .gte('created_at', weekAgo);
    const voteWeekMap = new Map<string, number>();
    (votesWeek || []).forEach((r: any) => voteWeekMap.set(r.product_id, (voteWeekMap.get(r.product_id) || 0) + 1));

    // Votes last 24h for trending today + fastest rising
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: votesDay } = await supabase
      .from('votes')
      .select('product_id')
      .in('product_id', productIds)
      .gte('created_at', dayAgo);
    const voteDayMap = new Map<string, number>();
    (votesDay || []).forEach((r: any) => voteDayMap.set(r.product_id, (voteDayMap.get(r.product_id) || 0) + 1));

    const todayRanking = [...voteDayMap.entries()].sort((a, b) => b[1] - a[1]);
    const top1 = todayRanking[0]?.[0];
    const top10 = new Set(todayRanking.slice(0, 10).map(([id]) => id));
    const homepageTop15 = new Set(todayRanking.slice(0, 15).map(([id]) => id));
    const fastestRising = top1; // simplest proxy: top vote velocity
    const mostSavedThisWeek = [...saveWeekMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const popularThisWeek = new Set(
      [...voteWeekMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id)
    );

    const newAchievements: any[] = [];

    for (const p of products) {
      const checks: Array<{ type: string; cond: boolean; value: number | null }> = [];

      // Trending tier
      if (top1 === p.id) checks.push({ type: 'trending_1', cond: true, value: voteDayMap.get(p.id) || 0 });
      if (top10.has(p.id)) checks.push({ type: 'trending_top_10', cond: true, value: voteDayMap.get(p.id) || 0 });
      if (homepageTop15.has(p.id)) checks.push({ type: 'homepage_trending', cond: true, value: voteDayMap.get(p.id) || 0 });
      if (fastestRising === p.id) checks.push({ type: 'fastest_rising', cond: true, value: voteDayMap.get(p.id) || 0 });
      if (popularThisWeek.has(p.id)) checks.push({ type: 'popular_week', cond: true, value: voteWeekMap.get(p.id) || 0 });
      if (mostSavedThisWeek === p.id && (saveWeekMap.get(p.id) || 0) > 0) checks.push({ type: 'most_saved', cond: true, value: saveWeekMap.get(p.id) || 0 });

      // Editorial
      if ((p as any).featured) checks.push({ type: 'featured', cond: true, value: null });

      // Traffic
      const clicks = clickMap.get(p.id) || 0;
      for (const tier of CLICK_TIERS) {
        if (clicks >= tier.threshold) checks.push({ type: tier.type, cond: true, value: clicks });
      }
      const impressions = viewMap.get(p.id) || 0;
      if (impressions >= 10000) checks.push({ type: 'impressions_10000', cond: true, value: impressions });

      // Social
      const colls = collMap.get(p.id) || 0;
      if (colls >= 100) checks.push({ type: 'collections_100', cond: true, value: colls });

      for (const c of checks) {
        if (c.cond && !has(p.id, c.type)) {
          newAchievements.push({
            product_id: p.id,
            founder_id: p.owner_id,
            achievement_type: c.type,
            metric_value: c.value,
            metric_label: SPECS[c.type]?.title || c.type,
            email_status: 'pending',
          });
        }
      }
    }

    if (!newAchievements.length) {
      return new Response(JSON.stringify({ awarded: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert (upsert on conflict)
    const { data: inserted, error: insErr } = await supabase
      .from('product_achievements')
      .upsert(newAchievements, { onConflict: 'product_id,achievement_type', ignoreDuplicates: true })
      .select('id, product_id, founder_id, achievement_type, metric_value');
    if (insErr) console.error('insert error', insErr);

    const created = inserted || [];
    console.log('Awarded ' + created.length + ' new achievements');

    // Send emails
    let emailed = 0;
    if (created.length) {
      const founderIds = Array.from(new Set(created.map((a: any) => a.founder_id)));
      const productIdSet = Array.from(new Set(created.map((a: any) => a.product_id)));
      const { data: users } = await supabase
        .from('users')
        .select('id, email, name, username')
        .in('id', founderIds);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      const prodMap = new Map(products.map((p: any) => [p.id, p]));

      for (const a of created as any[]) {
        const user = userMap.get(a.founder_id);
        const product = prodMap.get(a.product_id);
        const spec = SPECS[a.achievement_type];
        if (!user?.email || !product || !spec) {
          await supabase.from('product_achievements').update({ email_status: 'skipped' }).eq('id', a.id);
          continue;
        }
        const metricLabel = a.metric_value ? Number(a.metric_value).toLocaleString() : spec.title;
        try {
          const html = buildEmail({
            productName: product.name,
            productSlug: product.slug,
            spec,
            metricLabel,
            achievementId: a.id,
            founderName: user.name || user.username,
          });
          await resend.emails.send({
            from: 'Launch <alex@trylaunch.ai>',
            to: [user.email],
            subject: spec.emailSubject,
            html,
          });
          await supabase
            .from('product_achievements')
            .update({ email_status: 'sent', email_sent_at: new Date().toISOString() })
            .eq('id', a.id);
          emailed++;
        } catch (e) {
          console.error('email failed for', a.id, e);
          await supabase.from('product_achievements').update({ email_status: 'failed' }).eq('id', a.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ awarded: created.length, emailed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('detect-milestones error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
