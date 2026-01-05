import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { toZonedTime } from 'https://esm.sh/date-fns-tz@3';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PST_TIMEZONE = 'America/Los_Angeles';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting launch scheduler check...');

    // Get current time in PST for comparison
    const nowPST = toZonedTime(new Date(), PST_TIMEZONE);
    console.log('Current PST time:', nowPST.toISOString());

    // Find all products scheduled to launch that are past their launch date (comparing in UTC)
    const { data: productsToLaunch, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'scheduled')
      .lte('launch_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled products:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${productsToLaunch?.length || 0} products to launch`);

    if (!productsToLaunch || productsToLaunch.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No products to launch', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = [];

    for (const product of productsToLaunch) {
      console.log(`Launching product: ${product.name} (${product.id})`);

      // Update product status to 'launched'
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ status: 'launched' })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Error launching product ${product.id}:`, updateError);
        results.push({ id: product.id, success: false, error: updateError.message });
        continue;
      }

      // Send email notification to product owner
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(product.owner_id);
        
        if (authUser?.user?.email) {
          const productUrl = `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/launch/${product.slug}`;
          const advertiseUrl = `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/advertise`;

          // Get weekly launch count for context
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const { count: weeklyLaunchCount } = await supabaseAdmin
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'launched')
            .gte('launch_date', oneWeekAgo.toISOString());

          const launchCountText = weeklyLaunchCount && weeklyLaunchCount > 10 
            ? `This week saw ${weeklyLaunchCount} new products launch, so standing out matters.`
            : 'Standing out in a crowded market matters.';

          const emailHtml = `
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
                  .content p { margin: 0 0 16px 0; color: #4b5563; }
                  .button { display: inline-block; background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
                  .tips { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                  .tips p { margin: 0 0 12px 0; }
                  ul { color: #4b5563; padding-left: 20px; margin: 0; }
                  li { margin-bottom: 8px; }
                  .cta-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b; }
                  .cta-box p { margin: 0; color: #92400e; }
                  .cta-box a { color: #92400e; font-weight: 600; }
                  .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="card">
                    <div class="header">
                      <img src="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/images/email-logo.png" alt="Launch" class="logo" />
                    </div>
                    <div class="content">
                      <h1>You're live on Launch! 🎉</h1>
                      <p><strong>${product.name}</strong> is now live and visible to our community.</p>
                      <p>${launchCountText}</p>
                      <p style="text-align: center; margin: 24px 0;">
                        <a href="${productUrl}" class="button">View Your Launch</a>
                      </p>
                      <div class="tips">
                        <p><strong>Quick wins to boost visibility:</strong></p>
                        <ul>
                          <li>Share your launch link on Twitter/X and LinkedIn</li>
                          <li>Reply to every comment within the first hour</li>
                          <li>Ask your network to upvote and leave feedback</li>
                        </ul>
                      </div>
                      <div class="cta-box">
                        <p>Want help with positioning or extra visibility? <strong>Just reply to this email</strong> — we read every message and can help you stand out.</p>
                        <p style="margin-top: 12px;"><a href="${advertiseUrl}">Or explore our visibility options →</a></p>
                      </div>
                    </div>
                    <div class="footer">
                      <p>Good luck with your launch! 🚀</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: 'Launch <notifications@trylaunch.ai>',
            to: [authUser.user.email],
            reply_to: 'alex@trylaunch.ai',
            subject: `🚀 You're live on Launch!`,
            html: emailHtml,
          });

          console.log(`Launch live email sent to owner of ${product.id}`);
        }
      } catch (emailError) {
        console.error(`Error sending launch email for ${product.id}:`, emailError);
      }

      // Get all followers of this product
      const { data: followers, error: followersError } = await supabaseAdmin
        .from('product_follows')
        .select('follower_id')
        .eq('product_id', product.id);

      if (followersError) {
        console.error(`Error fetching followers for ${product.id}:`, followersError);
      }

      // Send notifications to all followers
      if (followers && followers.length > 0) {
        console.log(`Notifying ${followers.length} followers of product ${product.id}`);
        
        for (const follower of followers) {
          try {
            await supabaseAdmin.functions.invoke('send-notifications', {
              body: {
                userId: follower.follower_id,
                type: 'product_launch',
                title: `${product.name} just launched!`,
                message: `The product you're following is now live.`,
                relatedProductId: product.id,
              },
            });
          } catch (notifError) {
            console.error(`Error sending notification to follower ${follower.follower_id}:`, notifError);
          }
        }
        
        console.log(`Sent notifications to ${followers.length} followers for product ${product.id}`);
      }

      results.push({ id: product.id, name: product.name, success: true });
    }

    // Check for products launching tomorrow (24h reminder)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const { data: productsLaunchingTomorrow } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, owner_id, launch_date')
      .eq('status', 'scheduled')
      .gte('launch_date', tomorrowStart.toISOString())
      .lte('launch_date', tomorrowEnd.toISOString());

    console.log(`Found ${productsLaunchingTomorrow?.length || 0} products launching tomorrow`);

    // Send reminder emails
    for (const product of productsLaunchingTomorrow || []) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(product.owner_id);
        
        if (authUser?.user?.email) {
          const launchDateFormatted = new Date(product.launch_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Los_Angeles'
          });

          const productUrl = `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/launch/${product.slug}`;
          const editUrl = `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/submit?productId=${product.id}`;

          const emailHtml = `
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
                  .content p { margin: 0 0 16px 0; color: #4b5563; }
                  .highlight { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb; }
                  .date { font-size: 18px; font-weight: 600; color: #111; margin: 8px 0 0 0; }
                  .button { display: inline-block; background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 0 5px; }
                  .button-secondary { background: #6b7280; }
                  .checklist { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
                  .checklist p { margin: 0 0 12px 0; }
                  ul { color: #4b5563; padding-left: 20px; margin: 0; }
                  li { margin-bottom: 8px; }
                  .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="card">
                    <div class="header">
                      <img src="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/images/email-logo.png" alt="Launch" class="logo" />
                    </div>
                    <div class="content">
                      <h1>Launching Tomorrow!</h1>
                      <p>Your product <strong>${product.name}</strong> launches in less than 24 hours.</p>
                      <div class="highlight">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Launch Time (PST)</p>
                        <p class="date">${launchDateFormatted}</p>
                      </div>
                      <div class="checklist">
                        <p><strong>Pre-launch checklist:</strong></p>
                        <ul>
                          <li>Review your product description</li>
                          <li>Check your screenshots and media</li>
                          <li>Prepare social media announcements</li>
                          <li>Alert your team and supporters</li>
                        </ul>
                      </div>
                      <p style="text-align: center; margin-top: 24px;">
                        <a href="${productUrl}" class="button">Preview Launch</a>
                        <a href="${editUrl}" class="button button-secondary">Edit Product</a>
                      </p>
                    </div>
                    <div class="footer">
                      <p>Get ready for your launch!</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: 'Launch <notifications@trylaunch.ai>',
            to: [authUser.user.email],
            subject: `⏰ Reminder: ${product.name} launches tomorrow!`,
            html: emailHtml,
          });

          console.log(`24h reminder email sent for product ${product.id}`);
        }
      } catch (emailError) {
        console.error(`Error sending reminder email for ${product.id}:`, emailError);
      }
    }

    console.log('Launch scheduler completed');

    return new Response(
      JSON.stringify({ 
        message: 'Launch scheduler completed',
        launched: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in launch scheduler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});