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

    // Find launched products that do NOT have an outcome reported
    // and were launched at least 7 days ago (give them time)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data: launchedProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'launched')
      .lte('launch_date', sevenDaysAgo)
      .gte('launch_date', sixtyDaysAgo)
      .order('launch_date', { ascending: false });

    if (prodError) throw prodError;
    if (!launchedProducts || launchedProducts.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No eligible products' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing outcomes to exclude
    const productIds = launchedProducts.map((p) => p.id);
    const { data: existingOutcomes } = await (supabase as any)
      .from('product_outcomes')
      .select('product_id')
      .in('product_id', productIds);

    const hasOutcome = new Set((existingOutcomes || []).map((o: any) => o.product_id));

    // Filter to products without outcomes
    const eligible = launchedProducts.filter((p) => !hasOutcome.has(p.id));

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'All products have outcomes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by owner (one email per owner, featuring their top product)
    const ownerProducts = new Map<string, typeof eligible>();
    for (const p of eligible) {
      if (!ownerProducts.has(p.owner_id)) ownerProducts.set(p.owner_id, []);
      ownerProducts.get(p.owner_id)!.push(p);
    }

    // Get owner profiles
    const ownerIds = [...ownerProducts.keys()];
    const { data: owners } = await supabase
      .from('users')
      .select('id, email, name, username')
      .in('id', ownerIds);

    const ownerMap = new Map((owners || []).map((o) => [o.id, o]));

    // Get vote counts for eligible products
    const { data: votes } = await supabase
      .from('votes')
      .select('product_id')
      .in('product_id', eligible.map((p) => p.id));

    const voteMap = new Map<string, number>();
    votes?.forEach((v) => {
      voteMap.set(v.product_id, (voteMap.get(v.product_id) || 0) + 1);
    });

    let sentCount = 0;

    for (const [ownerId, products] of ownerProducts) {
      try {
        const owner = ownerMap.get(ownerId);
        if (!owner?.email) continue;

        // Pick their most-voted product
        const topProduct = products.sort(
          (a, b) => (voteMap.get(b.id) || 0) - (voteMap.get(a.id) || 0),
        )[0];

        const productVotes = voteMap.get(topProduct.id) || 0;

        const emailHtml = buildNudgeEmail({
          ownerName: owner.name || owner.username || null,
          productName: topProduct.name,
          productSlug: topProduct.slug,
          votes: productVotes,
          otherProductCount: products.length - 1,
        });

        await resend.emails.send({
          from: 'Launch <hello@trylaunch.ai>',
          to: [owner.email],
          subject: `📊 How did ${topProduct.name} do after launch?`,
          html: emailHtml,
        });

        sentCount++;
        console.log(`Sent outcome nudge to ${owner.email} for ${topProduct.name}`);
      } catch (err) {
        console.error(`Error emailing owner ${ownerId}:`, err);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, eligible: ownerProducts.size }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Outcome nudge email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

interface NudgeEmailParams {
  ownerName: string | null;
  productName: string;
  productSlug: string;
  votes: number;
  otherProductCount: number;
}

function buildNudgeEmail(params: NudgeEmailParams): string {
  const { ownerName, productName, productSlug, votes, otherProductCount } = params;
  const greeting = ownerName ? `Hey ${ownerName}` : 'Hey there';
  const analyticsUrl = `${PRODUCTION_URL}/launch/${productSlug}/analytics`;
  const successStoriesUrl = `${PRODUCTION_URL}/success-stories`;
  const otherLine = otherProductCount > 0
    ? `<p style="font-size:13px; color:#9ca3af;">You have ${otherProductCount} other product${otherProductCount > 1 ? 's' : ''} on Launch — you can report outcomes for those too.</p>`
    : '';

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
          .stats-row { display: flex; gap: 12px; margin: 20px 0; }
          .stat { flex: 1; text-align: center; padding: 14px; background: #f3f4f6; border-radius: 8px; }
          .stat-value { font-size: 22px; font-weight: 700; color: #111; display: block; }
          .stat-label { font-size: 11px; color: #6b7280; margin-top: 2px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
          .why-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
          .why-box h3 { margin: 0 0 8px; font-size: 14px; color: #92400e; }
          .why-box ul { margin: 0; padding-left: 18px; }
          .why-box li { color: #92400e; font-size: 13px; margin-bottom: 4px; }
          .cta { display: inline-block; background: #111; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <img src="${PRODUCTION_URL}/images/email-logo.png" alt="Launch" class="logo" />
            </div>
            <div class="content">
              <h1>📊 How did ${productName} do?</h1>
              <p>${greeting}, it's been a while since you launched <strong>${productName}</strong> on Launch. We'd love to know how it went!</p>

              ${votes > 0 ? `
              <div class="stats-row">
                <div class="stat">
                  <span class="stat-value">${votes}</span>
                  <span class="stat-label">Votes received</span>
                </div>
              </div>
              ` : ''}

              <p>Take 30 seconds to share your results — signups, revenue, or just a quick testimonial. Your story helps other makers see what's possible.</p>

              <div class="why-box">
                <h3>Why share your outcomes?</h3>
                <ul>
                  <li>Inspire other makers with real results</li>
                  <li>Get featured on our <a href="${successStoriesUrl}" style="color:#92400e;">Success Stories</a> page</li>
                  <li>Build credibility for your product</li>
                </ul>
              </div>

              <p style="text-align: center; margin: 28px 0;">
                <a href="${analyticsUrl}" class="cta">Share Your Results →</a>
              </p>

              ${otherLine}

              <p style="font-size:13px; color:#9ca3af; text-align:center; margin-top:20px;">
                It takes less than 30 seconds. Just enter your signups, revenue, or a quick quote.
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
