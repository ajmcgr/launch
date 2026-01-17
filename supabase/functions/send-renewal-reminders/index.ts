import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Find users whose subscriptions will renew in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStart = new Date(sevenDaysFromNow);
    sevenDaysStart.setHours(0, 0, 0, 0);
    const sevenDaysEnd = new Date(sevenDaysFromNow);
    sevenDaysEnd.setHours(23, 59, 59, 999);

    // Get users with active subscriptions expiring in 7 days
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, stripe_subscription_id, annual_access_expires_at, subscription_cancel_at_period_end')
      .eq('subscription_status', 'active')
      .eq('subscription_cancel_at_period_end', false)
      .gte('annual_access_expires_at', sevenDaysStart.toISOString())
      .lte('annual_access_expires_at', sevenDaysEnd.toISOString());

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    console.log(`Found ${users?.length || 0} users with renewals in 7 days`);

    let sentCount = 0;
    
    for (const user of users || []) {
      try {
        // Get user email from auth
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
        
        if (!authUser?.user?.email) {
          console.log(`No email for user ${user.id}, skipping`);
          continue;
        }

        const renewalDate = new Date(user.annual_access_expires_at!).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const productionUrl = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';

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
                .highlight { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #fcd34d; }
                .button { display: inline-block; background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
                .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="header">
                    <img src="${productionUrl}/images/email-logo.png" alt="Launch" class="logo" />
                  </div>
                  <div class="content">
                    <h1>Your Launch Pass Renews Soon</h1>
                    <p>This is a friendly reminder that your Launch Pass subscription will automatically renew in 7 days.</p>
                    <div class="highlight">
                      <p style="margin: 0; color: #92400e; font-size: 14px;">Renewal Date</p>
                      <p style="font-size: 18px; font-weight: bold; color: #78350f; margin: 8px 0 0 0;">${renewalDate}</p>
                      <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">$99 will be charged to your payment method</p>
                    </div>
                    <p>If you'd like to continue enjoying unlimited launches and relaunches, no action is needed - your subscription will renew automatically.</p>
                    <p>If you'd like to cancel, you can do so from your account settings before the renewal date.</p>
                    <p style="text-align: center; margin-top: 24px;">
                      <a href="${productionUrl}/settings?tab=billing" class="button">Manage Subscription</a>
                    </p>
                  </div>
                  <div class="footer">
                    <p>Thank you for being a Launch Pass member.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;

        await resend.emails.send({
          from: 'Launch <notifications@trylaunch.ai>',
          to: [authUser.user.email],
          subject: '🔔 Your Launch Pass renews in 7 days',
          html: emailHtml,
        });

        sentCount++;
        console.log(`Sent renewal reminder to ${authUser.user.email}`);
      } catch (emailError) {
        console.error(`Error sending reminder to user ${user.id}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: sentCount }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-renewal-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
