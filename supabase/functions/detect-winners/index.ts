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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Starting winner detection...');

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find top 3 weekly products (launched in last 7 days with most votes)
    const { data: weeklyVotes, error: weeklyError } = await supabaseClient
      .from('votes')
      .select('product_id, value, products!inner(launch_date, status)')
      .gte('products.launch_date', oneWeekAgo.toISOString())
      .eq('products.status', 'launched');

    if (weeklyError) {
      console.error('Error fetching weekly votes:', weeklyError);
      throw weeklyError;
    }

    const winners = {
      gold: null as string | null,   // #1 weekly → won_monthly
      silver: null as string | null, // #2 weekly → won_weekly
      bronze: null as string | null, // #3 weekly → won_daily
    };

    if (weeklyVotes && weeklyVotes.length > 0) {
      const productVotes: Record<string, number> = {};
      weeklyVotes.forEach((vote: any) => {
        productVotes[vote.product_id] = (productVotes[vote.product_id] || 0) + vote.value;
      });

      const sorted = Object.entries(productVotes).sort((a, b) => b[1] - a[1]);

      if (sorted[0]) {
        winners.gold = sorted[0][0];
        console.log(`🥇 Gold (#1 Weekly): ${sorted[0][0]} with ${sorted[0][1]} votes`);
      }
      if (sorted[1]) {
        winners.silver = sorted[1][0];
        console.log(`🥈 Silver (#2 Weekly): ${sorted[1][0]} with ${sorted[1][1]} votes`);
      }
      if (sorted[2]) {
        winners.bronze = sorted[2][0];
        console.log(`🥉 Bronze (#3 Weekly): ${sorted[2][0]} with ${sorted[2][1]} votes`);
      }
    }

    // NOTE: We do NOT reset winner flags - once a product wins, it keeps that badge permanently
    // won_monthly = Gold (#1 weekly), won_weekly = Silver (#2 weekly), won_daily = Bronze (#3 weekly)
    console.log('Setting new winners (preserving past winners)...');

    const updates = [];

    if (winners.gold) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_monthly: true })
          .eq('id', winners.gold)
      );
    }

    if (winners.silver) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_weekly: true })
          .eq('id', winners.silver)
      );
    }

    if (winners.bronze) {
      updates.push(
        supabaseClient
          .from('products')
          .update({ won_daily: true })
          .eq('id', winners.bronze)
      );
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        console.error('Errors updating winners:', errors);
      } else {
        console.log('Successfully updated all winners');
      }
    }

    // Send celebratory emails to winners
    const tierConfig = [
      { id: winners.gold, rank: '#1', emoji: '🥇', label: 'Gold', color: '#D4AF37' },
      { id: winners.silver, rank: '#2', emoji: '🥈', label: 'Silver', color: '#A8A9AD' },
      { id: winners.bronze, rank: '#3', emoji: '🥉', label: 'Bronze', color: '#CD7F32' },
    ];

    let emailsSent = 0;

    for (const tier of tierConfig) {
      if (!tier.id) continue;

      // Fetch product + owner info
      const { data: product } = await supabaseClient
        .from('products')
        .select('name, slug, owner_id')
        .eq('id', tier.id)
        .single();

      if (!product || !product.owner_id) continue;

      const { data: owner } = await supabaseClient
        .from('users')
        .select('email, username, full_name')
        .eq('id', product.owner_id)
        .single();

      if (!owner?.email) continue;

      const ownerName = owner.full_name || owner.username || 'Maker';
      const productUrl = PRODUCTION_URL + '/products/' + product.slug;
      const awardsUrl = PRODUCTION_URL + '/awards';

      try {
        await resend.emails.send({
          from: 'TryLaunch <launches@trylaunch.ai>',
          to: [owner.email],
          subject: tier.emoji + ' ' + product.name + ' is ' + tier.rank + ' Product of the Week!',
          html: buildAwardEmail(ownerName, product.name, tier, productUrl, awardsUrl),
        });
        emailsSent++;
        console.log('Award email sent to ' + owner.email + ' for ' + tier.label + ' (' + product.name + ')');
      } catch (emailErr) {
        console.error('Failed to send award email for ' + tier.label + ':', emailErr);
      }
    }

    console.log('Total award emails sent: ' + emailsSent);

    return new Response(
      JSON.stringify({
        success: true,
        winners,
        emailsSent,
        message: 'Winner detection completed — top 3 weekly products awarded'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in detect-winners function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function buildAwardEmail(
  ownerName: string,
  productName: string,
  tier: { rank: string; emoji: string; label: string; color: string },
  productUrl: string,
  awardsUrl: string
): string {
  var html = '';
  html += '<!DOCTYPE html><html><head><meta charset="utf-8"></head>';
  html += '<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,sans-serif;">';
  html += '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">';
  html += '<tr><td align="center">';
  html += '<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">';

  // Header banner
  html += '<tr><td style="background:linear-gradient(135deg,' + tier.color + ',#1a1a2e);padding:40px 30px;text-align:center;">';
  html += '<div style="font-size:64px;margin-bottom:12px;">' + tier.emoji + '</div>';
  html += '<h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Congratulations!</h1>';
  html += '<p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0;">You earned the <strong>' + tier.label + ' Award</strong></p>';
  html += '</td></tr>';

  // Body
  html += '<tr><td style="padding:30px;">';
  html += '<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 16px;">Hey ' + ownerName + ',</p>';
  html += '<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 16px;">';
  html += 'Amazing news! 🎉 <strong>' + productName + '</strong> has been ranked <strong>' + tier.rank + ' Product of the Week</strong> on TryLaunch!';
  html += '</p>';
  html += '<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">';
  html += 'Your product stood out from the crowd and earned a permanent <strong>' + tier.emoji + ' ' + tier.label + ' badge</strong> on its listing. Well done!';
  html += '</p>';

  // CTA buttons
  html += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
  html += '<td align="center" style="padding-bottom:12px;">';
  html += '<a href="' + productUrl + '" style="display:inline-block;background-color:' + tier.color + ';color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:16px;font-weight:bold;">View Your Product</a>';
  html += '</td></tr><tr><td align="center">';
  html += '<a href="' + awardsUrl + '" style="display:inline-block;background-color:#f3f4f6;color:#374151;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">See All Awards</a>';
  html += '</td></tr></table>';

  // Share prompt
  html += '<div style="margin-top:24px;padding:16px;background-color:#fffbeb;border-radius:8px;border:1px solid #fde68a;">';
  html += '<p style="font-size:14px;color:#92400e;margin:0;"><strong>📣 Spread the word!</strong> Share your award on social media and let your community celebrate with you.</p>';
  html += '</div>';

  html += '</td></tr>';

  // Footer
  html += '<tr><td style="padding:20px 30px;background-color:#f9fafb;text-align:center;">';
  html += '<p style="font-size:12px;color:#9ca3af;margin:0;">TryLaunch — Discover and launch amazing products</p>';
  html += '</td></tr>';

  html += '</table></td></tr></table></body></html>';
  return html;
}
