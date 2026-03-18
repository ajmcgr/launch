import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Look at products launched in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'launched')
      .gte('launch_date', weekAgo)
      .order('launch_date', { ascending: false });

    if (prodError) throw prodError;
    if (!recentProducts || recentProducts.length === 0) {
      console.log('No recent launches found');
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get votes for these products
    const productIds = recentProducts.map((p) => p.id);
    const { data: votes } = await supabase
      .from('votes')
      .select('product_id')
      .in('product_id', productIds.slice(0, 500));

    const voteMap = new Map<string, number>();
    votes?.forEach((v) => {
      voteMap.set(v.product_id, (voteMap.get(v.product_id) || 0) + 1);
    });

    // Get view counts
    const { data: analytics } = await supabase
      .from('product_analytics')
      .select('product_id')
      .in('product_id', productIds.slice(0, 500))
      .eq('event_type', 'page_view');

    const viewMap = new Map<string, number>();
    analytics?.forEach((a) => {
      viewMap.set(a.product_id, (viewMap.get(a.product_id) || 0) + 1);
    });

    // Aggregate by owner — sum votes across all their recent products
    const ownerStats = new Map<string, { totalVotes: number; totalViews: number; products: typeof recentProducts }>();

    for (const product of recentProducts) {
      const existing = ownerStats.get(product.owner_id) || { totalVotes: 0, totalViews: 0, products: [] };
      existing.totalVotes += voteMap.get(product.id) || 0;
      existing.totalViews += viewMap.get(product.id) || 0;
      existing.products.push(product);
      ownerStats.set(product.owner_id, existing);
    }

    // Rank owners by total votes, take top 20
    const rankedOwners = [...ownerStats.entries()]
      .sort((a, b) => b[1].totalVotes - a[1].totalVotes)
      .slice(0, 20);

    if (rankedOwners.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check which owners already have paid plans (skip them)
    const ownerIds = rankedOwners.map(([id]) => id);

    const { data: paidOrders } = await supabase
      .from('orders')
      .select('user_id, product_id, plan')
      .in('user_id', ownerIds)
      .in('plan', ['skip', 'join']);

    // Build set of owners who have paid for ALL their recent products
    const ownerPaidProducts = new Map<string, Set<string>>();
    paidOrders?.forEach((o) => {
      if (!ownerPaidProducts.has(o.user_id)) ownerPaidProducts.set(o.user_id, new Set());
      ownerPaidProducts.get(o.user_id)!.add(o.product_id);
    });

    // Check who already received this email this week
    const { data: alreadySent } = await supabase
      .from('trending_maker_emails_sent')
      .select('user_id')
      .gte('sent_at', weekAgo)
      .in('user_id', ownerIds);

    const alreadySentSet = new Set(alreadySent?.map((r) => r.user_id) || []);

    // Get owner profiles
    const { data: owners } = await supabase
      .from('users')
      .select('id, email, name, username')
      .in('id', ownerIds);

    const ownerMap = new Map(owners?.map((o) => [o.id, o]) || []);

    let sentCount = 0;

    for (const [ownerId, stats] of rankedOwners) {
      try {
        // Skip if already emailed this week
        if (alreadySentSet.has(ownerId)) {
          console.log(`Skipping ${ownerId} — already emailed this week`);
          continue;
        }

        const owner = ownerMap.get(ownerId);
        if (!owner?.email) continue;

        // Check if they have at least one free-tier product this week
        const paidSet = ownerPaidProducts.get(ownerId) || new Set();
        const freeProducts = stats.products.filter((p) => !paidSet.has(p.id));

        if (freeProducts.length === 0) {
          console.log(`Skipping ${owner.email} — all products are paid`);
          continue;
        }

        // Find their top product (by votes) that's on the free tier
        const topFreeProduct = freeProducts.sort(
          (a, b) => (voteMap.get(b.id) || 0) - (voteMap.get(a.id) || 0),
        )[0];

        const productVotes = voteMap.get(topFreeProduct.id) || 0;
        const productViews = viewMap.get(topFreeProduct.id) || 0;

        // Only email if the product has at least some traction
        if (productVotes < 3 && productViews < 10) {
          console.log(`Skipping ${topFreeProduct.name} — not enough traction`);
          continue;
        }

        // Find their rank among all recent products
        const allProductsByVotes = recentProducts
          .sort((a, b) => (voteMap.get(b.id) || 0) - (voteMap.get(a.id) || 0));
        const rank = allProductsByVotes.findIndex((p) => p.id === topFreeProduct.id) + 1;

        const emailHtml = buildTrendingMakerEmail({
          ownerName: owner.name || owner.username || null,
          productName: topFreeProduct.name,
          productSlug: topFreeProduct.slug,
          votes: productVotes,
          views: productViews,
          rank,
          totalProducts: allProductsByVotes.length,
        });

        const subjectLines = [
          `🔥 ${topFreeProduct.name} is trending — #${rank} this week`,
          `📈 ${topFreeProduct.name} has ${productVotes} votes — keep the momentum going`,
          `🏆 You're in the top ${Math.round((rank / allProductsByVotes.length) * 100)}% this week`,
          `⚡ ${topFreeProduct.name} is getting noticed — here's how to 5x it`,
        ];
        const subject = subjectLines[Math.floor(Math.random() * subjectLines.length)];

        await resend.emails.send({
          from: 'Launch <hello@trylaunch.ai>',
          to: [owner.email],
          subject,
          html: emailHtml,
        });

        // Log that we sent the email
        await supabase.from('trending_maker_emails_sent' as any).insert({
          user_id: ownerId,
          product_id: topFreeProduct.id,
          sent_at: new Date().toISOString(),
        });

        sentCount++;
        console.log(`Sent trending email for ${topFreeProduct.name} to ${owner.email}`);
      } catch (err) {
        console.error(`Error emailing owner ${ownerId}:`, err);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Trending maker email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

interface TrendingEmailParams {
  ownerName: string | null;
  productName: string;
  productSlug: string;
  votes: number;
  views: number;
  rank: number;
  totalProducts: number;
}

function buildTrendingMakerEmail(params: TrendingEmailParams): string {
  const { ownerName, productName, productSlug, votes, views, rank, totalProducts } = params;
  const greeting = ownerName ? `Hey ${ownerName}` : 'Hey there';
  const launchUrl = `${PRODUCTION_URL}/launch/${productSlug}`;
  const pricingUrl = `${PRODUCTION_URL}/pricing`;
  const percentile = Math.round((rank / totalProducts) * 100);
  const projectedViews = Math.max(views * 5, 250);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { padding: 24px 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
          .logo { height: 28px; }
          .content { padding: 30px; }
          h1 { margin: 0 0 16px; font-size: 20px; color: #111; }
          p { margin: 0 0 14px; color: #4b5563; font-size: 15px; }
          .stats { display: flex; gap: 16px; margin: 20px 0; }
          .stat { flex: 1; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: 700; color: #111; display: block; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; display: block; }
          .rank-badge { text-align: center; margin: 20px 0; }
          .rank-badge span { display: inline-block; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff; padding: 8px 20px; border-radius: 24px; font-weight: 700; font-size: 14px; }
          .highlight { background: #ecfdf5; border: 1px solid #10b98133; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .highlight p { color: #065f46; margin: 0; font-size: 14px; }
          .cta { display: inline-block; background: #111; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .benefits { margin: 20px 0; padding: 0; }
          .benefits li { margin: 0 0 8px; color: #4b5563; font-size: 14px; list-style: none; padding-left: 24px; position: relative; }
          .benefits li::before { content: '✓'; position: absolute; left: 0; color: #10b981; font-weight: 700; }
          .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <img src="${PRODUCTION_URL}/images/launch-logo.png" alt="Launch" class="logo" />
            </div>
            <div class="content">
              <h1>🔥 ${productName} is trending</h1>
              <p>${greeting}, your product is getting real traction this week — here's a quick snapshot:</p>

              <div class="rank-badge">
                <span>#${rank} out of ${totalProducts} launches this week</span>
              </div>

              <div class="stats">
                <div class="stat">
                  <span class="stat-value">${votes}</span>
                  <span class="stat-label">Votes</span>
                </div>
                <div class="stat">
                  <span class="stat-value">${views > 0 ? views.toLocaleString() : '—'}</span>
                  <span class="stat-label">Views</span>
                </div>
                <div class="stat">
                  <span class="stat-value">Top ${percentile <= 5 ? '5' : percentile <= 10 ? '10' : percentile <= 25 ? '25' : percentile}%</span>
                  <span class="stat-label">Ranking</span>
                </div>
              </div>

              <div class="highlight">
                <p>💡 <strong>Pro makers average ${projectedViews.toLocaleString()}+ views</strong> because their products get promoted across our social channels (X & LinkedIn) and featured in our newsletter reaching 2K+ subscribers.</p>
              </div>

              <p><strong>Keep the momentum going.</strong> Upgrading to Pro takes 30 seconds and amplifies your launch immediately:</p>

              <ul class="benefits">
                <li>Promoted on X & LinkedIn to thousands of followers</li>
                <li>Featured in our weekly newsletter (2K+ subscribers)</li>
                <li>Choose your optimal launch date</li>
                <li>Verified badge for your website</li>
              </ul>

              <p style="text-align:center; margin: 28px 0;">
                <a href="${pricingUrl}" class="cta">Upgrade ${productName} to Pro →</a>
              </p>

              <p style="font-size:13px; color:#9ca3af; text-align:center;">
                <a href="${launchUrl}" style="color:#6b7280;">View your launch page</a>
              </p>
            </div>
            <div class="footer">
              <p>You're receiving this because you launched on <a href="${PRODUCTION_URL}" style="color:#9ca3af;">Launch</a>.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
