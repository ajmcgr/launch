import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 500;
const RESEND_BATCH_SIZE = 5;
const RESEND_BATCH_DELAY_MS = 1050;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJsonBody(req: Request) {
  const rawBody = await req.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch (_error) {
    return {};
  }
}

function getPositiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

async function addContactToResend(audienceId: string, resendApiKey: string, user: any, profile: any) {
  const fullName = (profile?.full_name as string) || (profile?.username as string) || '';
  const [first, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);

  try {
    const resp = await fetch(
      'https://api.resend.com/audiences/' + audienceId + '/contacts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + resendApiKey,
        },
        body: JSON.stringify({
          email: user.email,
          first_name: first || '',
          last_name: rest.join(' ') || '',
          unsubscribed: false,
        }),
      },
    );

    if (resp.ok) return 'added';
    if (resp.status === 422 || resp.status === 409) return 'skipped';
    if (resp.status === 429) {
      await wait(RESEND_BATCH_DELAY_MS);
      return addContactToResend(audienceId, resendApiKey, user, profile);
    }

    console.error('add failed', user.email, resp.status, await resp.text());
    return 'error';
  } catch (error) {
    console.error('add exception', user.email, error);
    return 'error';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')?.trim();
    const audienceId = Deno.env.get('RESEND_AUDIENCE_DAILY_DIGEST_ID')?.trim();
    const matchingEnvKeys = Object.keys(Deno.env.toObject())
      .filter((key) => key.includes('RESEND') || key.includes('AUDIENCE'))
      .sort();
    const requestUrl = new URL(req.url);
    const body = await readJsonBody(req);
    const page = getPositiveInt(body.page ?? requestUrl.searchParams.get('page'), DEFAULT_PAGE, 100000);
    const perPage = getPositiveInt(body.perPage ?? requestUrl.searchParams.get('perPage'), DEFAULT_PER_PAGE, DEFAULT_PER_PAGE);

    if (!resendApiKey) throw new Error('RESEND_API_KEY missing');
    if (!audienceId) {
      console.error('Missing RESEND_AUDIENCE_DAILY_DIGEST_ID. Matching env keys:', matchingEnvKeys);
      throw new Error('RESEND_AUDIENCE_DAILY_DIGEST_ID missing. Matching env keys: ' + matchingEnvKeys.join(', '));
    }

    // Verify admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: isAdmin } = await userClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (!isAdmin) throw new Error('Admin access required');

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    let added = 0;
    let skipped = 0;
    let errors = 0;

    const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = list?.users || [];
    const ids = users.map((u) => u.id);
    const { data: profiles } = ids.length
      ? await admin.from('profiles').select('id, username, full_name').in('id', ids)
      : { data: [] };
    const profileMap = new Map<string, any>();
    profiles?.forEach((p: any) => profileMap.set(p.id, p));
    const usersWithEmail = users.filter((u) => Boolean(u.email));
    skipped += users.length - usersWithEmail.length;

    for (let i = 0; i < usersWithEmail.length; i += RESEND_BATCH_SIZE) {
      const batch = usersWithEmail.slice(i, i + RESEND_BATCH_SIZE);
      const results = await Promise.all(
        batch.map((u) => addContactToResend(audienceId, resendApiKey, u, profileMap.get(u.id))),
      );

      for (const result of results) {
        if (result === 'added') added++;
        else if (result === 'skipped') skipped++;
        else errors++;
      }

      if (i + RESEND_BATCH_SIZE < usersWithEmail.length) {
        await wait(RESEND_BATCH_DELAY_MS);
      }
    }

    const hasMore = users.length === perPage;

    return new Response(JSON.stringify({ added, skipped, errors, page, perPage, hasMore, nextPage: hasMore ? page + 1 : null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync-users-to-resend-audience error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
