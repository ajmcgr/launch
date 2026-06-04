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

export function unauthorizedResponse(corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
