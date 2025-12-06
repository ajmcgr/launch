import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify the user is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Check if user is admin
    const { data: isAdmin } = await userClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    // Use service role to access auth.users
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const beehiivApiKey = Deno.env.get('BEEHIIV_API_KEY');
    const beehiivPubId = Deno.env.get('BEEHIIV_PUB_ID');

    if (!beehiivApiKey || !beehiivPubId) {
      throw new Error('Beehiiv configuration is missing');
    }

    // Fetch all users from auth.users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000
    });

    if (authError) {
      throw new Error(`Failed to fetch users: ${authError.message}`);
    }

    console.log(`Found ${authUsers.users.length} users to sync`);

    const results = {
      total: authUsers.users.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Subscribe each user to Beehiiv
    for (const authUser of authUsers.users) {
      if (!authUser.email) {
        results.skipped++;
        continue;
      }

      try {
        const response = await fetch(
          `https://api.beehiiv.com/v2/publications/${beehiivPubId}/subscriptions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${beehiivApiKey}`,
            },
            body: JSON.stringify({
              email: authUser.email,
              reactivate_existing: false,
              send_welcome_email: false, // Don't spam existing users
            }),
          }
        );

        if (response.ok) {
          results.success++;
          console.log(`Subscribed: ${authUser.email}`);
        } else {
          const errorText = await response.text();
          // 409 means already subscribed, which is fine
          if (response.status === 409) {
            results.skipped++;
            console.log(`Already subscribed: ${authUser.email}`);
          } else {
            results.failed++;
            results.errors.push(`${authUser.email}: ${errorText}`);
            console.error(`Failed to subscribe ${authUser.email}: ${errorText}`);
          }
        }

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
        results.errors.push(`${authUser.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('Sync complete:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to sync users' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
