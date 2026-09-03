import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } },
    );
    const token = authHeader.slice("Bearer ".length);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;

    const body = await req.json().catch(() => ({}));
    if (body.action === "status") {
      return json({ hasBillingCustomer: Boolean(profile?.stripe_customer_id) });
    }
    if (!profile?.stripe_customer_id) return json({ error: "No billing information found" }, 404);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    const productionUrl = (Deno.env.get("PRODUCTION_URL") || "https://trylaunch.ai").replace(/\/$/, "");

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${productionUrl}/settings?tab=billing`,
    });

    return json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return json({ error: "Unable to access billing portal" }, 500);
  }
});
