import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const DISCOURSE_SSO_SECRET = Deno.env.get('DISCOURSE_SSO_SECRET')!;
const DISCOURSE_FORUM_URL = Deno.env.get('DISCOURSE_FORUM_URL')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateHmac(data: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

function base64Decode(str: string): string {
  return atob(str);
}

function base64Encode(str: string): string {
  return btoa(str);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sso: ssoPayload, sig: signature } = await req.json();

    console.log('Received SSO request:', { ssoPayload: !!ssoPayload, signature: !!signature });

    if (!ssoPayload || !signature) {
      console.error('Missing sso or sig parameters');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the incoming signature
    const expectedSignature = generateHmac(ssoPayload, DISCOURSE_SSO_SECRET);
    if (signature !== expectedSignature) {
      console.error('Invalid signature', { received: signature, expected: expectedSignature });
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode the payload to get nonce
    const decodedPayload = base64Decode(ssoPayload);
    const params = new URLSearchParams(decodedPayload);
    const nonce = params.get('nonce');

    if (!nonce) {
      console.error('Missing nonce in payload');
      return new Response(
        JSON.stringify({ error: 'Missing nonce' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Nonce extracted:', nonce);

    // Get the authorization token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get the current user by passing the JWT token directly
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id, user.email);

    // Get user profile for additional info
    const { data: profile } = await supabase
      .from('users')
      .select('username, name, avatar_url')
      .eq('id', user.id)
      .single();

    console.log('User profile:', profile);

    // Build the response payload
    const responseParams = new URLSearchParams({
      nonce: nonce,
      email: user.email || '',
      external_id: user.id,
      username: profile?.username || user.email?.split('@')[0] || 'user',
      name: profile?.name || profile?.username || '',
    });

    // Add avatar if available
    if (profile?.avatar_url) {
      responseParams.set('avatar_url', profile.avatar_url);
    }

    // Encode and sign the response
    const responsePayload = base64Encode(responseParams.toString());
    const responseSignature = generateHmac(responsePayload, DISCOURSE_SSO_SECRET);

    // Build the redirect URL
    const redirectUrl = `${DISCOURSE_FORUM_URL}/session/sso_login?sso=${encodeURIComponent(responsePayload)}&sig=${responseSignature}`;

    console.log('Generated redirect URL');

    // Return the redirect URL
    return new Response(
      JSON.stringify({ redirectUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in discourse-sso function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
