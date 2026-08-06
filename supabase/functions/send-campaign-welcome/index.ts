import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL') || 'https://trylaunch.ai';
const CAMPAIGN_URL = 'https://vibecodedit.com';

// NOTE: HTML is built with string concatenation on purpose (multi-line template
// literals break the edge bundler on this project).
function buildWelcomeHtml(productName: string, productSlug: string): string {
  const launchUrl = PRODUCTION_URL + '/launch/' + productSlug;
  const shareText = encodeURIComponent(
    'I just launched ' + productName + ' as part of Vibe Coded It 🚀\n\n' + launchUrl
  );

  return '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>' +
    '<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
    '<div style="max-width:600px;margin:0 auto;padding:40px 20px;">' +
    '<div style="background:#ffffff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">' +
    '<div style="padding:30px;text-align:center;border-bottom:1px solid #e5e7eb;">' +
    '<p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">Vibe Coded It</p>' +
    '</div>' +
    '<div style="padding:30px;">' +
    '<h1 style="margin:0 0 16px 0;font-size:22px;color:#111;">Welcome to the movement 🎉</h1>' +
    '<p style="margin:0 0 16px 0;color:#4b5563;font-size:15px;">' + productName +
    ' is now part of Vibe Coded It and live on Launch, where hundreds of thousands of monthly active users discover new products.</p>' +
    '<p style="margin:0 0 24px 0;color:#4b5563;font-size:15px;">Your product carries the ' +
    '<strong>Built through Vibe Coded It</strong> badge and appears on the Builder Wall.</p>' +
    '<p style="margin:0 0 28px 0;">' +
    '<a href="' + launchUrl + '" style="display:inline-block;background:#1e6fd9;color:#ffffff !important;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">View your launch</a>' +
    '</p>' +
    '<h3 style="margin:0 0 12px 0;font-size:15px;color:#111;">Share it</h3>' +
    '<p style="margin:0 0 24px 0;">' +
    '<a href="https://twitter.com/intent/tweet?text=' + shareText + '" style="display:inline-block;padding:10px 20px;border-radius:6px;background:#000;color:#fff !important;text-decoration:none;font-size:14px;font-weight:500;margin-right:8px;">Share on X</a>' +
    '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(launchUrl) + '" style="display:inline-block;padding:10px 20px;border-radius:6px;background:#0A66C2;color:#fff !important;text-decoration:none;font-size:14px;font-weight:500;">Share on LinkedIn</a>' +
    '</p>' +
    '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px 20px;margin:24px 0;">' +
    '<p style="margin:0;font-size:14px;color:#0c4a6e;">Next step: post your first comment on your launch page telling people why you built it. Launches with a founder comment get far more feedback.</p>' +
    '</div>' +
    '<p style="margin:0;color:#4b5563;font-size:14px;">See everyone else building at <a href="' + CAMPAIGN_URL + '" style="color:#1e6fd9;">vibecodedit.com</a>.</p>' +
    '</div>' +
    '<div style="padding:20px 30px;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">' +
    'Launch · Works App, Inc. · <a href="' + PRODUCTION_URL + '" style="color:#9ca3af;">trylaunch.ai</a>' +
    '</div></div></div></body></html>';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { productId, campaign } = await req.json();
    if (!productId) {
      return new Response(JSON.stringify({ error: 'productId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, slug, owner_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduplicate: only ever one welcome per product.
    const { data: existing } = await supabase
      .from('campaign_events')
      .select('id')
      .eq('product_id', productId)
      .eq('event_type', 'campaign_email_sent')
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ skipped: 'already sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(product.owner_id);
    const email = authUser?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: 'No owner email' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendResult = await resend.emails.send({
      from: 'Alex from Launch <alex@trylaunch.ai>',
      to: [email],
      subject: 'Welcome to Vibe Coded It 🚀',
      html: buildWelcomeHtml(product.name, product.slug),
    });

    if ((sendResult as any)?.error) {
      const details = JSON.stringify((sendResult as any).error);
      console.error('Resend send failed: ' + details);
      return new Response(JSON.stringify({ error: 'Email send failed', details }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('campaign_events').insert({
      campaign: campaign || 'vibe_code_your_future',
      event_type: 'campaign_email_sent',
      product_id: productId,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-campaign-welcome error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
