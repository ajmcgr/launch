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

    // Find free-tier products launched ~48h ago that haven't received a winback email
    const cutoffStart = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    const cutoffEnd = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();

    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, slug, owner_id, launch_date, winback_email_sent')
      .eq('status', 'launched')
      .eq('winback_email_sent', false)
      .gte('launch_date', cutoffStart)
      .lte('launch_date', cutoffEnd);

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      throw fetchError;
    }

    if (!products || products.length === 0) {
      console.log('No products eligible for winback email');
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${products.length} products eligible for winback`);

    let sentCount = 0;

    for (const product of products) {
      try {
        // Check if there's a paid order for this product
        const { data: order } = await supabase
          .from('orders')
          .select('plan')
          .eq('product_id', product.id)
          .in('plan', ['skip', 'join'])
          .limit(1)
          .single();

        // Skip if they already have a paid plan
        if (order) {
          console.log(`Skipping ${product.name} - has paid plan: ${order.plan}`);
          await supabase
            .from('products')
            .update({ winback_email_sent: true })
            .eq('id', product.id);
          continue;
        }

        // Get owner email
        const { data: owner } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', product.owner_id)
          .single();

        if (!owner?.email) continue;

        // Get view count
        const { count: viewCount } = await supabase
          .from('product_analytics')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('event_type', 'page_view');

        // Get vote count
        const { count: voteCount } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id);

        const views = viewCount ?? 0;
        const votes = voteCount ?? 0;
        const launchUrl = `${PRODUCTION_URL}/launch/${product.slug}`;
        const pricingUrl = `${PRODUCTION_URL}/pricing`;

        const emailHtml = buildWinbackEmail(product.name, views, votes, launchUrl, pricingUrl, owner.name);

        await resend.emails.send({
          from: 'Launch <hello@trylaunch.ai>',
          to: [owner.email],
          subject: `📊 ${product.name} got ${views} views — here's how to get more`,
          html: emailHtml,
        });

        await supabase
          .from('products')
          .update({ winback_email_sent: true })
          .eq('id', product.id);

        sentCount++;
        console.log(`Sent winback email for ${product.name} to ${owner.email}`);
      } catch (err) {
        console.error(`Error processing product ${product.name}:`, err);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Winback email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});

function buildWinbackEmail(
  productName: string,
  views: number,
  votes: number,
  launchUrl: string,
  pricingUrl: string,
  ownerName?: string | null,
): string {
  const greeting = ownerName ? `Hey ${ownerName}` : 'Hey there';
  const viewsDisplay = views > 0 ? views.toLocaleString() : '—';
  const votesDisplay = votes > 0 ? votes.toLocaleString() : '—';
  const projectedViews = Math.max(views * 5, 100);

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
          .highlight { background: #fef3c7; border: 1px solid #f59e0b33; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .highlight p { color: #92400e; margin: 0; font-size: 14px; }
          .cta { display: inline-block; background: #111; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
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
              <h1>Your first 48 hours on Launch</h1>
              <p>${greeting}, here's how <strong>${productName}</strong> is doing so far:</p>

              <div class="stats">
                <div class="stat">
                  <span class="stat-value">${viewsDisplay}</span>
                  <span class="stat-label">Views</span>
                </div>
                <div class="stat">
                  <span class="stat-value">${votesDisplay}</span>
                  <span class="stat-label">Votes</span>
                </div>
              </div>

              <div class="highlight">
                <p>🚀 <strong>Pro launches average ${projectedViews.toLocaleString()}+ views</strong> thanks to social promotion on X & LinkedIn plus our 2K+ subscriber newsletter. That's 5–10x more visibility.</p>
              </div>

              <p>Upgrading takes 30 seconds and starts working immediately — your product gets promoted in our next social post and newsletter issue.</p>

              <p style="text-align:center; margin: 28px 0;">
                <a href="${pricingUrl}" class="cta">Boost ${productName} →</a>
              </p>

              <p style="font-size:13px; color:#9ca3af;">
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
