import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';

const shareSubjects = [
  '🚀 Your launch is live on Launch',
  'Your product just went live',
  'Time to share your launch',
];

function getRandomSubject(): string {
  return shareSubjects[Math.floor(Math.random() * shareSubjects.length)];
}

function buildShareEmailHtml(productName: string, productSlug: string): string {
  const launchUrl = `${PRODUCTION_URL}/launch/${productSlug}`;
  const xShareText = encodeURIComponent(`Just launched my project on Launch 🚀\n\nWould love feedback from builders:\n\n${launchUrl}`);
  const linkedInShareText = encodeURIComponent(`Just launched our product on Launch.\n\nWould love feedback from other founders:\n\n${launchUrl}`);
  const xShareUrl = `https://twitter.com/intent/tweet?text=${xShareText}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(launchUrl)}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
          .logo { height: 32px; }
          .content { padding: 30px; }
          .content h1 { margin: 0 0 16px 0; font-size: 22px; color: #111; }
          .content p { margin: 0 0 16px 0; color: #4b5563; font-size: 15px; }
          .launch-link { display: inline-block; background: #111; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .share-section { margin: 28px 0; }
          .share-section h3 { margin: 0 0 12px 0; font-size: 15px; color: #111; }
          .share-buttons { display: flex; gap: 10px; }
          .share-btn { display: inline-block; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; text-align: center; }
          .share-x { background: #000; color: #fff !important; }
          .share-linkedin { background: #0A66C2; color: #fff !important; }
          .share-copy { background: #e5e7eb; color: #111 !important; }
          .tip-box { background: #f0fdf4; padding: 16px 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #bbf7d0; }
          .tip-box p { margin: 0; color: #166534; font-size: 14px; }
          .places-list { color: #4b5563; padding-left: 20px; margin: 12px 0 0 0; }
          .places-list li { margin-bottom: 6px; font-size: 14px; }
          .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <img src="${PRODUCTION_URL}/images/email-logo.png" alt="Launch" class="logo" />
            </div>
            <div class="content">
              <h1>Your product just launched on Launch 🎉</h1>
              <p><strong>${productName}</strong> is now live.</p>
              <p>Now comes the important part: getting feedback and early users.</p>
              <p>Most successful launches happen when founders share their page with their community.</p>
              
              <p style="text-align: center; margin: 28px 0;">
                <a href="${launchUrl}" class="launch-link">View your launch →</a>
              </p>

              <div class="share-section">
                <h3>Quick share:</h3>
                <!--[if mso]>
                <table role="presentation" cellspacing="0" cellpadding="0"><tr>
                <td style="padding-right:10px"><![endif]-->
                <a href="${xShareUrl}" class="share-btn share-x" target="_blank" style="display:inline-block;margin-right:8px;margin-bottom:8px;">Share on X</a>
                <!--[if mso]></td><td><![endif]-->
                <a href="${linkedInShareUrl}" class="share-btn share-linkedin" target="_blank" style="display:inline-block;margin-right:8px;margin-bottom:8px;">Share on LinkedIn</a>
                <!--[if mso]></td></tr></table><![endif]-->
              </div>

              <div class="tip-box">
                <p><strong>💡 Tip:</strong> Founders who share their launch early tend to get more feedback, more clicks, and more visibility on the leaderboard.</p>
              </div>

              <p style="font-size: 14px; color: #6b7280;">Easy places to post your launch:</p>
              <ul class="places-list">
                <li>X / Twitter</li>
                <li>LinkedIn</li>
                <li>Indie Hackers</li>
                <li>Reddit</li>
                <li>Your Discord or Slack community</li>
              </ul>

              <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">Good luck with the launch.</p>
              <p style="color: #6b7280; font-size: 14px;">— Launch</p>
            </div>
            <div class="footer">
              <p>You're receiving this because you launched a product on Launch.<br/>
              <a href="${PRODUCTION_URL}/settings" style="color: #6b7280;">Manage notifications</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildOutcomeEmailHtml(productName: string, productSlug: string, views: number, clicks: number): string {
  const analyticsUrl = `${PRODUCTION_URL}/launch/${productSlug}/analytics`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
          .logo { height: 32px; }
          .content { padding: 30px; }
          .content h1 { margin: 0 0 16px 0; font-size: 22px; color: #111; }
          .content p { margin: 0 0 16px 0; color: #4b5563; font-size: 15px; }
          .stats-row { display: flex; gap: 16px; margin: 24px 0; }
          .stat-box { flex: 1; background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; }
          .stat-number { font-size: 28px; font-weight: 700; color: #111; display: block; }
          .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .cta-link { display: inline-block; background: #111; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .tip-box { background: #eff6ff; padding: 16px 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #bfdbfe; }
          .tip-box p { margin: 0; color: #1e40af; font-size: 14px; }
          .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <img src="${PRODUCTION_URL}/images/email-logo.png" alt="Launch" class="logo" />
            </div>
            <div class="content">
              <h1>How did your launch go? 📊</h1>
              <p>It's been a week since <strong>${productName}</strong> launched. Here's what we tracked:</p>
              
              <!--[if mso]>
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr>
              <td width="50%" style="padding-right:8px"><![endif]-->
              <div style="display:inline-block;width:48%;vertical-align:top;background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;margin-right:2%;">
                <span style="font-size:28px;font-weight:700;color:#111;">${views}</span><br/>
                <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Page Views</span>
              </div>
              <!--[if mso]></td><td width="50%" style="padding-left:8px"><![endif]-->
              <div style="display:inline-block;width:48%;vertical-align:top;background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;">
                <span style="font-size:28px;font-weight:700;color:#111;">${clicks}</span><br/>
                <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Referral Clicks</span>
              </div>
              <!--[if mso]></td></tr></table><![endif]-->

              <p style="margin-top: 24px;">But we can't see the full picture — only you know the real results.</p>
              <p><strong>Did you get signups? Revenue? Your first users?</strong></p>
              <p>Take 30 seconds to report your outcomes. It helps us improve Launch and your story could inspire other makers.</p>

              <p style="text-align: center; margin: 28px 0;">
                <a href="${analyticsUrl}" class="cta-link">Report your outcomes →</a>
              </p>

              <div class="tip-box">
                <p><strong>💡 Why report?</strong> Makers who share their results get featured on our success stories page and help us build a better platform for everyone.</p>
              </div>

              <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">— Launch</p>
            </div>
            <div class="footer">
              <p>You're receiving this because you launched a product on Launch.<br/>
              <a href="${PRODUCTION_URL}/settings" style="color: #6b7280;">Manage notifications</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildReminderEmailHtml(productName: string, productSlug: string): string {
  const launchUrl = `${PRODUCTION_URL}/launch/${productSlug}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header { padding: 30px; text-align: center; border-bottom: 1px solid #e5e7eb; }
          .logo { height: 32px; }
          .content { padding: 30px; }
          .content h1 { margin: 0 0 16px 0; font-size: 20px; color: #111; }
          .content p { margin: 0 0 16px 0; color: #4b5563; font-size: 15px; }
          .launch-link { display: inline-block; background: #111; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <img src="${PRODUCTION_URL}/images/email-logo.png" alt="Launch" class="logo" />
            </div>
            <div class="content">
              <h1>Quick tip to boost your launch</h1>
              <p>Your launch <strong>${productName}</strong> is live but it may need a small push.</p>
              <p>Sharing your launch with your network is the fastest way to get feedback and early traction.</p>
              
              <p style="text-align: center; margin: 28px 0;">
                <a href="${launchUrl}" class="launch-link">View your launch →</a>
              </p>

              <p>Even one post can bring your first users.</p>
              <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">— Launch</p>
            </div>
            <div class="footer">
              <p>You're receiving this because you launched a product on Launch.<br/>
              <a href="${PRODUCTION_URL}/settings" style="color: #6b7280;">Manage notifications</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const results = { shareEmailsSent: 0, reminderEmailsSent: 0, errors: [] as string[] };

    // --- 1. Share emails: products launched 5+ minutes ago, not yet emailed ---
    const { data: recentLaunches, error: fetchErr } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'launched')
      .eq('launch_share_email_sent', false)
      .lte('launch_date', fiveMinutesAgo.toISOString());

    if (fetchErr) {
      console.error('Error fetching recent launches:', fetchErr);
      results.errors.push(fetchErr.message);
    }

    for (const product of recentLaunches || []) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(product.owner_id);
        if (!authUser?.user?.email) continue;

        const emailHtml = buildShareEmailHtml(product.name, product.slug);

        await resend.emails.send({
          from: 'Launch <notifications@trylaunch.ai>',
          to: [authUser.user.email],
          reply_to: 'alex@trylaunch.ai',
          subject: getRandomSubject(),
          html: emailHtml,
        });

        await supabaseAdmin
          .from('products')
          .update({ launch_share_email_sent: true })
          .eq('id', product.id);

        results.shareEmailsSent++;
        console.log(`Share email sent for product ${product.id} (${product.name})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error sending share email for ${product.id}:`, msg);
        results.errors.push(`share-${product.id}: ${msg}`);
      }
    }

    // --- 2. Reminder emails: products launched 24+ hours ago with <20 views ---
    const { data: lowViewLaunches, error: reminderErr } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'launched')
      .eq('launch_share_email_sent', true)
      .eq('launch_share_reminder_sent', false)
      .lte('launch_date', twentyFourHoursAgo.toISOString());

    if (reminderErr) {
      console.error('Error fetching low-view launches:', reminderErr);
      results.errors.push(reminderErr.message);
    }

    for (const product of lowViewLaunches || []) {
      try {
        // Check view count from analytics
        const { data: analytics } = await supabaseAdmin
          .from('product_analytics')
          .select('page_views')
          .eq('product_id', product.id)
          .single();

        const views = analytics?.page_views || 0;

        if (views >= 20) {
          // Mark as sent so we don't re-check
          await supabaseAdmin
            .from('products')
            .update({ launch_share_reminder_sent: true })
            .eq('id', product.id);
          continue;
        }

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(product.owner_id);
        if (!authUser?.user?.email) continue;

        const emailHtml = buildReminderEmailHtml(product.name, product.slug);

        await resend.emails.send({
          from: 'Launch <notifications@trylaunch.ai>',
          to: [authUser.user.email],
          reply_to: 'alex@trylaunch.ai',
          subject: 'Quick tip to boost your launch',
          html: emailHtml,
        });

        await supabaseAdmin
          .from('products')
          .update({ launch_share_reminder_sent: true })
          .eq('id', product.id);

        results.reminderEmailsSent++;
        console.log(`Reminder email sent for product ${product.id} (${product.name})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error sending reminder for ${product.id}:`, msg);
        results.errors.push(`reminder-${product.id}: ${msg}`);
      }
    }

    // --- 3. Day-7 outcome emails: products launched 7+ days ago, prompt to report results ---
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    const { data: day7Launches, error: day7Err } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'launched')
      .eq('launch_share_reminder_sent', true)
      .lte('launch_date', sevenDaysAgo.toISOString())
      .gte('launch_date', eightDaysAgo.toISOString());

    if (day7Err) {
      console.error('Error fetching day-7 launches:', day7Err);
      results.errors.push(day7Err.message);
    }

    for (const product of day7Launches || []) {
      try {
        // Check if we already sent an outcome email (use product_analytics to avoid adding a column)
        const { count: outcomeEmailCount } = await supabaseAdmin
          .from('product_analytics')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('event_type', 'outcome_email_sent');

        if ((outcomeEmailCount || 0) > 0) continue;

        // Get some stats to include in the email
        const { count: viewCount } = await supabaseAdmin
          .from('product_analytics')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('event_type', 'page_view');

        const { count: clickCount } = await supabaseAdmin
          .from('product_analytics')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('event_type', 'referral_click');

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(product.owner_id);
        if (!authUser?.user?.email) continue;

        const emailHtml = buildOutcomeEmailHtml(product.name, product.slug, viewCount || 0, clickCount || 0);

        await resend.emails.send({
          from: 'Launch <notifications@trylaunch.ai>',
          to: [authUser.user.email],
          reply_to: 'alex@trylaunch.ai',
          subject: `How did your launch of ${product.name} go?`,
          html: emailHtml,
        });

        // Mark as sent via analytics event
        await supabaseAdmin
          .from('product_analytics')
          .insert({ product_id: product.id, event_type: 'outcome_email_sent' });

        results.outcomeEmailsSent = (results.outcomeEmailsSent || 0) + 1;
        console.log(`Outcome email sent for product ${product.id} (${product.name})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error sending outcome email for ${product.id}:`, msg);
        results.errors.push(`outcome-${product.id}: ${msg}`);
      }
    }

    console.log('Launch share email job completed:', results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in send-launch-share-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
