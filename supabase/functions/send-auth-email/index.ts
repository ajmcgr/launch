import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailPayload {
  user: {
    email: string;
    user_metadata?: {
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

const getEmailContent = (type: string, confirmUrl: string, userName?: string) => {
  const baseUrl = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';
  
  const templates: Record<string, { subject: string; title: string; message: string; buttonText: string }> = {
    signup: {
      subject: "Welcome to Launch - Confirm your email",
      title: "Welcome to Launch! 🚀",
      message: "Thanks for signing up. Please confirm your email address to get started discovering and launching amazing products.",
      buttonText: "Confirm Email",
    },
    magiclink: {
      subject: "Your Launch login link",
      title: "Login to Launch",
      message: "Click the button below to log in to your Launch account. This link will expire in 1 hour.",
      buttonText: "Log In",
    },
    recovery: {
      subject: "Reset your Launch password",
      title: "Reset Your Password",
      message: "We received a request to reset your password. Click the button below to choose a new password.",
      buttonText: "Reset Password",
    },
    invite: {
      subject: "You've been invited to Launch",
      title: "You're Invited! 🎉",
      message: "You've been invited to join Launch. Click the button below to accept the invitation and create your account.",
      buttonText: "Accept Invitation",
    },
    email_change: {
      subject: "Confirm your new email address",
      title: "Confirm Email Change",
      message: "Please confirm your new email address by clicking the button below.",
      buttonText: "Confirm New Email",
    },
  };

  const template = templates[type] || templates.signup;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              <img src="${baseUrl}/images/email-logo.png" alt="Launch" class="logo" />
            </div>
            <div class="content">
              <h1>${template.title}</h1>
              <p>${template.message}</p>
              <p><a href="${confirmUrl}" class="button" style="color: #ffffff !important;">${template.buttonText}</a></p>
            </div>
            <div class="footer">
              <p>If you didn't request this email, you can safely ignore it.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject: template.subject, html };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: AuthEmailPayload = await req.json();
    console.log("Auth email request:", JSON.stringify(payload, null, 2));

    const { user, email_data } = payload;
    const { token_hash, redirect_to, email_action_type } = email_data;

    // Build the confirmation URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const confirmUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    const userName = user.user_metadata?.name;
    const { subject, html } = getEmailContent(email_action_type, confirmUrl, userName);

    console.log(`Sending ${email_action_type} email to ${user.email}`);

    const { data, error } = await resend.emails.send({
      from: "Launch <hello@trylaunch.ai>",
      to: [user.email],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});