// RETIRED: the "Vibe Code Your Future" / Vibe Coded It welcome email was turned
// off when the campaign moved to its own site. This function is intentionally a
// no-op so any lingering caller (old client bundle, cron, manual invoke) cannot
// send that email again. Do not re-add Resend logic here.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('send-campaign-welcome invoked but is retired — no email sent');

  return new Response(
    JSON.stringify({ disabled: true, message: 'Campaign welcome email is retired; no email sent.' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
