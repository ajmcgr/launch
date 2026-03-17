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
  const trackableLink = `${PRODUCTION_URL}/go/${productSlug}`;
  const xShareText = encodeURIComponent(`Just launched my project on Launch 🚀\n\nWould love feedback from builders:\n\n${trackableLink}`);
  const linkedInShareText = encodeURIComponent(`Just launched our product on Launch.\n\nWould love feedback from other founders:\n\n${trackableLink}`);
  const xShareUrl = `https://twitter.com/intent/tweet?text=${xShareText}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(trackableLink)}`;

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
          .share-btn { display: inline-block; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; text-align: center; }
          .share-x { background: #000; color: #fff !important; }
          .share-linkedin { background: #0A66C2; color: #fff !important; }
          .trackable-box { background: #f0f9ff; padding: 16px 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #bae6fd; }
          .trackable-box p { margin: 0; font-size: 14px; }
          .trackable-url { display: block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin: 8px 0 4px 0; font-family: monospace; font-size: 14px; color: #111; word-break: break-all; }
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

              <div class="trackable-box">
                <p><strong>🔗 Your trackable launch link</strong></p>
                <p>Share this link to track clicks with UTM parameters:</p>
                <div class="trackable-url">${trackableLink}</div>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px;">This automatically adds UTM tags so you can see Launch traffic in your analytics.</p>
              </div>

              <div class="share-section">
                <h3>Quick share (uses your trackable link):</h3>
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

function buildOutcomeEmailHtml(productName: string, productSlug: string, views: number, clicks: number, votes: number): string {
  const analyticsUrl = `${PRODUCTION_URL}/launch/${productSlug}/analytics`;
  const trackableLink = `${PRODUCTION_URL}/go/${productSlug}`;
  const xShareText = encodeURIComponent(`We got ${votes} votes on @trylaunchai in our first week 🚀\n\nCheck it out:\n\n${trackableLink}`);
  const linkedInShareText = encodeURIComponent(`Our launch week results on Launch:\n\n📊 ${views} views\n🗳 ${votes} votes\n🔗 ${clicks} referral clicks\n\nCheck it out: ${trackableLink}`);
  const xShareUrl = `https://twitter.com/intent/tweet?text=${xShareText}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(trackableLink)}`;

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
          .cta-link { display: inline-block; background: #111; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
          .share-btn { display: inline-block; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; text-align: center; }
          .share-x { background: #000; color: #fff !important; }
          .share-linkedin { background: #0A66C2; color: #fff !important; }
          .share-section { margin: 28px 0; padding: 20px; background: #fefce8; border-radius: 8px; border: 1px solid #fef08a; }
          .share-section h3 { margin: 0 0 8px 0; font-size: 15px; color: #111; }
          .share-section p { margin: 0 0 12px 0; font-size: 14px; color: #4b5563; }
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
              <h1>Your first week on Launch 📊</h1>
              <p>It's been a week since <strong>${productName}</strong> launched. Here's what we tracked:</p>
              
              <!--[if mso]>
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr>
              <td width="33%" style="padding-right:4px"><![endif]-->
              <div style="display:inline-block;width:31%;vertical-align:top;background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;margin-right:2%;">
                <span style="font-size:28px;font-weight:700;color:#111;">${views}</span><br/>
                <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Views</span>
              </div>
              <!--[if mso]></td><td width="33%" style="padding:0 4px"><![endif]-->
              <div style="display:inline-block;width:31%;vertical-align:top;background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;margin-right:2%;">
                <span style="font-size:28px;font-weight:700;color:#111;">${votes}</span><br/>
                <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Votes</span>
              </div>
              <!--[if mso]></td><td width="33%" style="padding-left:4px"><![endif]-->
              <div style="display:inline-block;width:31%;vertical-align:top;background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;">
                <span style="font-size:28px;font-weight:700;color:#111;">${clicks}</span><br/>
                <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Clicks</span>
              </div>
              <!--[if mso]></td></tr></table><![endif]-->

              <div class="share-section">
                <h3>🎉 Share your results!</h3>
                <p>Let your audience know how the launch went. Pre-filled with your stats:</p>
                <a href="${xShareUrl}" class="share-btn share-x" target="_blank" style="display:inline-block;margin-right:8px;margin-bottom:8px;">Share on X</a>
                <a href="${linkedInShareUrl}" class="share-btn share-linkedin" target="_blank" style="display:inline-block;margin-bottom:8px;">Share on LinkedIn</a>
              </div>

              <p>But we can't see the full picture — only you know the real results.</p>
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
  const trackableLink = `${PRODUCTION_URL}/go/${productSlug}`;

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
          .trackable-box { background: #f0f9ff; padding: 14px 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd; }
          .trackable-url { font-family: monospace; font-size: 13px; color: #111; word-break: break-all; }
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

              <div class="trackable-box">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #475569;"><strong>🔗 Share your trackable link:</strong></p>
                <span class="trackable-url">${trackableLink}</span>
              </div>

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

function buildCommentNotificationHtml(productName: string, productSlug: string, commenterName: string, commentText: string): string {
  const launchUrl = `${PRODUCTION_URL}/launch/${productSlug}#comments`;

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
          .comment-box { background: #f3f4f6; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #6366f1; }
          .comment-author { font-weight: 600; color: #111; font-size: 14px; margin: 0 0 4px 0; }
          .comment-text { color: #4b5563; font-size: 14px; margin: 0; font-style: italic; }
          .cta-link { display: inline-block; background: #111; color: #fff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
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
              <h1>💬 New comment on ${productName}</h1>
              <p>Someone left feedback on your launch:</p>
              
              <div class="comment-box">
                <p class="comment-author">@${commenterName}</p>
                <p class="comment-text">"${commentText.substring(0, 300)}${commentText.length > 300 ? '...' : ''}"</p>
              </div>

              <p>Responding to comments helps build trust and can convert visitors into users.</p>

              <p style="text-align: center; margin: 28px 0;">
                <a href="${launchUrl}" class="cta-link">Reply to comment →</a>
              </p>

              <p style="color: #6b7280; font-size: 14px;">— Launch</p>
            </div>
            <div class="footer">
              <p>You're receiving this because someone commented on your product.<br/>
              <a href="${PRODUCTION_URL}/settings" style="color: #6b7280;">Manage notifications</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildMilestoneEmailHtml(productName: string, productSlug: string, milestoneType: string, milestoneValue: number): string {
  const trackableLink = `${PRODUCTION_URL}/go/${productSlug}`;
  const analyticsUrl = `${PRODUCTION_URL}/launch/${productSlug}/analytics`;
  
  const milestoneEmoji = milestoneType === 'votes' ? '🗳' : '🔗';
  const milestoneLabel = milestoneType === 'votes' ? 'votes' : 'referral clicks';
  const celebrationText = milestoneValue >= 100 
    ? `Incredible! ${productName} just hit ${milestoneValue} ${milestoneLabel}!`
    : `${productName} just hit ${milestoneValue} ${milestoneLabel}!`;
  
  const xShareText = encodeURIComponent(`${productName} just hit ${milestoneValue} ${milestoneLabel} on @trylaunchai! ${milestoneEmoji}\n\n${trackableLink}`);
  const xShareUrl = `https://twitter.com/intent/tweet?text=${xShareText}`;

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
          .content h1 { margin: 0 0 16px 0; font-size: 24px; color: #111; text-align: center; }
          .content p { margin: 0 0 16px 0; color: #4b5563; font-size: 15px; }
          .milestone-badge { text-align: center; margin: 24px 0; }
          .milestone-number { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 48px; font-weight: 800; padding: 20px 40px; border-radius: 16px; }
          .milestone-label { display: block; margin-top: 8px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
          .share-section { background: #fefce8; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #fef08a; text-align: center; }
          .share-section h3 { margin: 0 0 8px 0; font-size: 15px; color: #111; }
          .share-section p { margin: 0 0 12px 0; font-size: 14px; color: #4b5563; }
          .share-btn { display: inline-block; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; background: #000; color: #fff !important; }
          .cta-link { display: inline-block; background: #111; color: #fff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
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
              <h1>${milestoneEmoji} Milestone reached!</h1>
              <p style="text-align:center;font-size:16px;">${celebrationText}</p>
              
              <div class="milestone-badge">
                <span class="milestone-number">${milestoneValue}</span>
                <span class="milestone-label">${milestoneLabel}</span>
              </div>

              <div class="share-section">
                <h3>Share this milestone!</h3>
                <p>Let your community know about your progress:</p>
                <a href="${xShareUrl}" class="share-btn" target="_blank">Share on X →</a>
              </div>

              <p style="text-align: center; margin: 24px 0;">
                <a href="${analyticsUrl}" class="cta-link">View full analytics →</a>
              </p>

              <p style="color: #6b7280; font-size: 14px; text-align: center;">Keep the momentum going! 🚀</p>
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

// Milestone thresholds for votes and clicks
const VOTE_MILESTONES = [10, 25, 50, 100, 250, 500];
const CLICK_MILESTONES = [10, 25, 50, 100, 250, 500];

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

    const results = { shareEmailsSent: 0, reminderEmailsSent: 0, outcomeEmailsSent: 0, commentEmailsSent: 0, milestoneEmailsSent: 0, errors: [] as string[] };

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
        const { data: analytics } = await supabaseAdmin
          .from('product_analytics')
          .select('page_views')
          .eq('product_id', product.id)
          .single();

        const views = analytics?.page_views || 0;

        if (views >= 20) {
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

    // --- 3. Day-7 outcome emails with share CTA ---
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
        const { count: outcomeEmailCount } = await supabaseAdmin
          .from('product_analytics')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('event_type', 'outcome_email_sent');

        if ((outcomeEmailCount || 0) > 0) continue;

        // Get stats
        const [viewRes, clickRes, voteRes] = await Promise.all([
          supabaseAdmin
            .from('product_analytics')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', product.id)
            .eq('event_type', 'page_view'),
          supabaseAdmin
            .from('product_analytics')
            .select('id', { count: 'exact', head: true })
            .eq('product_id', product.id)
            .eq('event_type', 'referral_click'),
          supabaseAdmin
            .from('votes')
            .select('value')
            .eq('product_id', product.id),
        ]);

        const views = viewRes.count || 0;
        const clicks = clickRes.count || 0;
        const votes = (voteRes.data || []).reduce((sum: number, v: any) => sum + (v.value || 0), 0);

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(product.owner_id);
        if (!authUser?.user?.email) continue;

        const emailHtml = buildOutcomeEmailHtml(product.name, product.slug, views, clicks, votes);

        await resend.emails.send({
          from: 'Launch <notifications@trylaunch.ai>',
          to: [authUser.user.email],
          reply_to: 'alex@trylaunch.ai',
          subject: `How did your launch of ${product.name} go?`,
          html: emailHtml,
        });

        await supabaseAdmin
          .from('product_analytics')
          .insert({ product_id: product.id, event_type: 'outcome_email_sent' });

        results.outcomeEmailsSent++;
        console.log(`Outcome email sent for product ${product.id} (${product.name})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error sending outcome email for ${product.id}:`, msg);
        results.errors.push(`outcome-${product.id}: ${msg}`);
      }
    }

    // --- 4. Comment notification emails: recent comments (last 10 min) on launched products ---
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    const { data: recentComments, error: commentErr } = await supabaseAdmin
      .from('comments')
      .select('id, content, product_id, user_id, created_at')
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false });

    if (commentErr) {
      console.error('Error fetching recent comments:', commentErr);
      results.errors.push(commentErr.message);
    }

    for (const comment of recentComments || []) {
      try {
        // Check if we already sent a notification for this comment
        const { count: alreadySent } = await supabaseAdmin
          .from('product_analytics')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', comment.product_id)
          .eq('event_type', `comment_email_${comment.id}`);

        if ((alreadySent || 0) > 0) continue;

        // Get product info
        const { data: prod } = await supabaseAdmin
          .from('products')
          .select('id, name, slug, owner_id, status')
          .eq('id', comment.product_id)
          .eq('status', 'launched')
          .single();

        if (!prod) continue;
        // Don't email the owner about their own comment
        if (comment.user_id === prod.owner_id) continue;

        // Get commenter username
        const { data: commenter } = await supabaseAdmin
          .from('users')
          .select('username')
          .eq('id', comment.user_id)
          .single();

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(prod.owner_id);
        if (!authUser?.user?.email) continue;

        const emailHtml = buildCommentNotificationHtml(
          prod.name,
          prod.slug,
          commenter?.username || 'someone',
          comment.content || ''
        );

        await resend.emails.send({
          from: 'Launch <notifications@trylaunch.ai>',
          to: [authUser.user.email],
          subject: `💬 New comment on ${prod.name}`,
          html: emailHtml,
        });

        // Mark as sent
        await supabaseAdmin
          .from('product_analytics')
          .insert({ product_id: comment.product_id, event_type: `comment_email_${comment.id}` });

        results.commentEmailsSent++;
        console.log(`Comment notification sent for product ${prod.id}, comment ${comment.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error sending comment notification:`, msg);
        results.errors.push(`comment-${comment.id}: ${msg}`);
      }
    }

    // --- 5. Milestone emails: check vote and click thresholds for active launches ---
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: activeLaunches, error: activeErr } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'launched')
      .gte('launch_date', thirtyDaysAgo.toISOString());

    if (activeErr) {
      console.error('Error fetching active launches:', activeErr);
      results.errors.push(activeErr.message);
    }

    for (const product of activeLaunches || []) {
      try {
        // Get current vote count
        const { data: voteData } = await supabaseAdmin
          .from('votes')
          .select('value')
          .eq('product_id', product.id);

        const currentVotes = (voteData || []).reduce((sum: number, v: any) => sum + (v.value || 0), 0);

        // Get current referral click count
        const { count: currentClicks } = await supabaseAdmin
          .from('product_analytics')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('event_type', 'referral_click');

        // Check vote milestones
        for (const threshold of VOTE_MILESTONES) {
          if (currentVotes >= threshold) {
            const milestoneKey = `milestone_votes_${threshold}`;
            const { count: already } = await supabaseAdmin
              .from('product_analytics')
              .select('id', { count: 'exact', head: true })
              .eq('product_id', product.id)
              .eq('event_type', milestoneKey);

            if ((already || 0) > 0) continue;

            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(product.owner_id);
            if (!authUser?.user?.email) continue;

            const emailHtml = buildMilestoneEmailHtml(product.name, product.slug, 'votes', threshold);

            await resend.emails.send({
              from: 'Launch <notifications@trylaunch.ai>',
              to: [authUser.user.email],
              subject: `🗳 ${product.name} just hit ${threshold} votes!`,
              html: emailHtml,
            });

            await supabaseAdmin
              .from('product_analytics')
              .insert({ product_id: product.id, event_type: milestoneKey });

            results.milestoneEmailsSent++;
            console.log(`Vote milestone (${threshold}) email sent for ${product.id}`);
            break; // Only send one milestone per run
          }
        }

        // Check click milestones
        const clicks = currentClicks || 0;
        for (const threshold of CLICK_MILESTONES) {
          if (clicks >= threshold) {
            const milestoneKey = `milestone_clicks_${threshold}`;
            const { count: already } = await supabaseAdmin
              .from('product_analytics')
              .select('id', { count: 'exact', head: true })
              .eq('product_id', product.id)
              .eq('event_type', milestoneKey);

            if ((already || 0) > 0) continue;

            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(product.owner_id);
            if (!authUser?.user?.email) continue;

            const emailHtml = buildMilestoneEmailHtml(product.name, product.slug, 'clicks', threshold);

            await resend.emails.send({
              from: 'Launch <notifications@trylaunch.ai>',
              to: [authUser.user.email],
              subject: `🔗 ${product.name} just hit ${threshold} referral clicks!`,
              html: emailHtml,
            });

            await supabaseAdmin
              .from('product_analytics')
              .insert({ product_id: product.id, event_type: milestoneKey });

            results.milestoneEmailsSent++;
            console.log(`Click milestone (${threshold}) email sent for ${product.id}`);
            break; // Only send one milestone per run
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error checking milestones for ${product.id}:`, msg);
        results.errors.push(`milestone-${product.id}: ${msg}`);
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
