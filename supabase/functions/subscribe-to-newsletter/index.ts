import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, dailyDigest } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    const beehiivApiKey = Deno.env.get('BEEHIIV_API_KEY');
    const beehiivPubId = Deno.env.get('BEEHIIV_PUB_ID');

    if (!beehiivApiKey || !beehiivPubId) {
      throw new Error('Beehiiv configuration is missing');
    }

    const payload: Record<string, unknown> = {
      email,
      reactivate_existing: true,
      send_welcome_email: true,
    };

    // Tag user for daily digest segmentation in Beehiiv
    if (dailyDigest) {
      payload.custom_fields = [
        { name: 'daily_digest', value: 'true' },
      ];
      // Beehiiv supports tags via "utm_source" or custom fields; tags array also accepted
      (payload as any).tags = ['daily_digest'];
    }

    // Subscribe to Beehiiv
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${beehiivPubId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${beehiivApiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Beehiiv API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Beehiiv API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to subscribe' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
