import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface NotificationRequest {
  userId: string;
  type: 'new_follower' | 'new_comment' | 'product_launch' | 'new_vote';
  title: string;
  message: string;
  relatedProductId?: string;
  relatedUserId?: string;
  sendEmail?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, type, title, message, relatedProductId, relatedUserId, sendEmail = true }: NotificationRequest = await req.json();

    // Create in-app notification
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        related_product_id: relatedProductId,
        related_user_id: relatedUserId,
        email_sent: false,
      })
      .select()
      .single();

    if (notifError) {
      console.error('Error creating notification:', notifError);
      throw notifError;
    }

    // Send email if requested
    if (sendEmail) {
      // Get user email from auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUser?.user?.email) {
        const productUrl = relatedProductId
          ? `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/launch/${relatedProductId}`
          : Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';

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
                .content p { margin: 0 0 20px 0; color: #4b5563; }
                .button { display: inline-block; background: #206dcb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
                .footer { padding: 20px 30px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
                .footer a { color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="card">
                  <div class="header">
                    <img src="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/images/email-logo.png" alt="Launch" class="logo" />
                  </div>
                  <div class="content">
                    <h1>${title}</h1>
                    <p>${message}</p>
                    ${relatedProductId ? `<p><a href="${productUrl}" class="button" style="color: #ffffff !important;">View Product</a></p>` : ''}
                  </div>
                  <div class="footer">
                    <p>You're receiving this because you're a member of Launch.<br/>
                    <a href="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/settings">Manage notifications</a></p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `;

        try {
          const emailResponse = await resend.emails.send({
            from: 'Launch <notifications@trylaunch.ai>',
            to: [authUser.user.email],
            subject: title,
            html: emailHtml,
          });

          // Update notification to mark email as sent
          await supabaseAdmin
            .from('notifications')
            .update({ email_sent: true })
            .eq('id', notification.id);

        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Don't fail the whole request if email fails
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in send-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});