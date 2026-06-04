import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    if (!token || token.length > 256) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const tokenHash = await sha256Hex(token);
    const nowIso = new Date().toISOString();

    const { data: claim, error: claimErr } = await admin
      .from("product_claims")
      .select("id, product_id, claimant_user_id, status, code_expires_at")
      .eq("verification_code_hash", tokenHash)
      .eq("status", "pending")
      .maybeSingle();

    if (claimErr) {
      console.error("claim lookup error", claimErr);
      return new Response(JSON.stringify({ error: "Lookup failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!claim) {
      return new Response(JSON.stringify({ error: "This link is invalid or has already been used." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (claim.code_expires_at && claim.code_expires_at < nowIso) {
      return new Response(JSON.stringify({ error: "This link has expired. Request a new one." }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: product, error: prodErr } = await admin
      .from("products")
      .select("id, name, slug, claimed_at")
      .eq("id", claim.product_id)
      .single();
    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (product.claimed_at) {
      return new Response(JSON.stringify({ error: "This launch is already claimed." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: updProdErr } = await admin
      .from("products")
      .update({
        owner_id: claim.claimant_user_id,
        claimed_at: nowIso,
        submission_type: "founder",
      })
      .eq("id", product.id);
    if (updProdErr) {
      console.error("product update failed", updProdErr);
      return new Response(JSON.stringify({ error: "Could not transfer ownership" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("product_claims").update({
      status: "approved",
      reviewed_at: nowIso,
      reviewed_by: claim.claimant_user_id,
    }).eq("id", claim.id);

    await admin.from("product_claims").update({
      status: "rejected",
      reviewed_at: nowIso,
    }).eq("product_id", product.id).eq("status", "pending").neq("id", claim.id);

    return new Response(JSON.stringify({ success: true, productSlug: product.slug, productName: product.name }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("verify-product-claim error", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
