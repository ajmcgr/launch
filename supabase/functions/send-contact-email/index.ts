import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message }: ContactRequest = await req.json();

    // Validate required fields
    if (!name || !email || !message) {
      throw new Error("Missing required fields: name, email, and message are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    // Validate field lengths
    if (name.length > 100) {
      throw new Error("Name must be less than 100 characters");
    }
    if (email.length > 255) {
      throw new Error("Email must be less than 255 characters");
    }
    if (message.length > 2000) {
      throw new Error("Message must be less than 2000 characters");
    }

    // Send email to admin
    const emailResponse = await resend.emails.send({
      from: "Launch Contact <noreply@trylaunch.ai>",
      to: ["alex@trylaunch.ai"],
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <hr />
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          This message was sent via the Launch contact form at trylaunch.ai
        </p>
      `,
    });

    console.log("Contact email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
