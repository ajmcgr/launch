// Shared auth helper for cron/admin edge functions.
//
// Accepts either:
//   1. Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>  (used by pg_cron + admin server callers)
//   2. x-cron-secret: <CRON_SECRET>                       (used by external/manual triggers)
//
// Returns true when the request is authorized, false otherwise.
export function isCronAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const cronSecretHeader =
    req.headers.get('x-cron-secret') || req.headers.get('X-Cron-Secret') || '';

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const expectedCronSecret = Deno.env.get('CRON_SECRET') || '';

  if (serviceKey && authHeader === `Bearer ${serviceKey}`) return true;
  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) return true;
  return false;
}

// Extended check: cron/service-role OR a signed-in admin user (so these
// functions can also be triggered manually from the dashboard / admin UI).
export async function isCronOrAdminAuthorized(req: Request): Promise<boolean> {
  if (isCronAuthorized(req)) return true;

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return false;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceKey) return false;

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return false;

    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .limit(1);
    return Boolean(roles && roles.length > 0);
  } catch (err) {
    console.error('isCronOrAdminAuthorized error:', err);
    return false;
  }
}

export function unauthorizedResponse(corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
