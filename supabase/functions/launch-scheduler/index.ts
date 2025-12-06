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

          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                  .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                  .tips { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
                  .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 ${product.name} is LIVE!</h1>
                  </div>
                  <div class="content">
                    <p>Congratulations! Your product <strong>${product.name}</strong> is now live on Launch!</p>
                    <p style="text-align: center;">
                      <a href="${productUrl}" class="button">View Your Launch</a>
                    </p>
                    <div class="tips">
                      <p><strong>Tips to maximize your launch:</strong></p>
                      <ul>
                        <li>Share your launch link on social media</li>
                        <li>Engage with comments and feedback</li>
                        <li>Respond to early users quickly</li>
                      </ul>
                    </div>
                  </div>
                  <div class="footer">
                    <p>Good luck with your launch! 🚀</p>
                  </div>
                </div>
              </body>
            </html>
          `;

          await resend.emails.send({
            from: 'Launch <notifications@trylaunch.ai>',
            to: [authUser.user.email],
            subject: `🎉 ${product.name} is now LIVE on Launch!`,
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
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                  .highlight { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #f59e0b; }
                  .date { font-size: 18px; font-weight: bold; color: #d97706; }
                  .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
                  .button-secondary { background: #6b7280; }
                  .checklist { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
                  .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>⏰ Launching Tomorrow!</h1>
                  </div>
                  <div class="content">
                    <p>Your product <strong>${product.name}</strong> launches in less than 24 hours!</p>
                    <div class="highlight">
                      <p>Launch Time (PST):</p>
                      <p class="date">${launchDateFormatted}</p>
                    </div>
                    <div class="checklist">
                      <p><strong>Pre-launch checklist:</strong></p>
                      <ul>
                        <li>✅ Review your product description</li>
                        <li>✅ Check your screenshots and media</li>
                        <li>✅ Prepare social media announcements</li>
                        <li>✅ Alert your team and supporters</li>
                      </ul>
                    </div>
                    <p style="text-align: center;">
                      <a href="${productUrl}" class="button">Preview Launch</a>
                      <a href="${editUrl}" class="button button-secondary">Edit Product</a>
                    </p>
                  </div>
                  <div class="footer">
                    <p>Get ready for an amazing launch! 🚀</p>
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