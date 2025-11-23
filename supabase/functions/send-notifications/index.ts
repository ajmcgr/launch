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

    console.log(`Creating notification for user ${userId}, type: ${type}`);

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
        console.log(`Sending email to ${authUser.user.email}`);

        const productUrl = relatedProductId 
          ? `${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/launch/${relatedProductId}`
          : Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${title}</h1>
                </div>
                <div class="content">
                  <p>${message}</p>
                  ${relatedProductId ? `<a href="${productUrl}" class="button">View Product</a>` : ''}
                </div>
                <div class="footer">
                  <p>You're receiving this because you're a member of Launch. <br/>
                  Visit your <a href="${Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai'}/settings">settings</a> to manage notifications.</p>
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

          console.log('Email sent successfully:', emailResponse);

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