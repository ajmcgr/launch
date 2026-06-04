import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = Deno.env.get("PRODUCTION_URL") || "https://trylaunch.ai";
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "outlook.com",
  "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "aol.com", "gmx.com", "gmx.de", "mail.com",
  "yandex.com", "zoho.com", "fastmail.com", "duck.com",
]);

function normalizeDomain(input?: string | null): string | null {
  if (!input) return null;
  try {
    const t = input.trim().toLowerCase();
    const url = new URL(t.startsWith("http") ? t : `https://${t}`);
    return url.hostname.replace(/^www\./, "") || null;
  } catch { return null; }
}

function emailMatchesDomain(email: string, product: string): boolean {
  const e = email.split("@")[1]?.toLowerCase().trim();
  return !!e && (e === product || e.endsWith(`.${product}`));
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const productId = String(body.productId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!productId || !email) return new Response(JSON.stringify({ error: "productId and email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const emailDomain = email.split("@")[1];
    if (PUBLIC_EMAIL_DOMAINS.has(emailDomain)) {
      return new Response(JSON.stringify({ error: "Please use a company email at the product's domain (not a public provider like Gmail)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: product, error: prodErr } = await admin.from("products").select("id, name, slug, domain_url, claimed_at, submission_type, owner_id").eq("id", productId).single();
    if (prodErr || !product) return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (product.claimed_at) return new Response(JSON.stringify({ error: "This launch is already claimed." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (product.owner_id === user.id) return new Response(JSON.stringify({ error: "You already submitted this launch." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const productDomain = normalizeDomain(product.domain_url);
    if (!productDomain) return new Response(JSON.stringify({ error: "Product has no domain to verify against." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!emailMatchesDomain(email, productDomain)) return new Response(JSON.stringify({ error: `Email must be @${productDomain}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = generateToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("product_claims").insert({
      product_id: productId,
      claimant_user_id: user.id,
      verification_method: "email_domain",
      verification_email: email,
      verification_code_hash: tokenHash,
      code_expires_at: expiresAt,
      status: "pending",
      message: "Email-domain auto-verify",
    });
    if (insErr) {
      console.error("insert claim failed", insErr);
      return new Response(JSON.stringify({ error: "Could not create claim" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const verifyUrl = `${PRODUCTION_URL}/claim/verify?token=${encodeURIComponent(token)}`;
    const safeName = (product.name || "your launch").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html =
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">' +
      '<h2 style="color:#111;margin:0 0 16px;">Verify your claim of ' + safeName + '</h2>' +
      '<p style="color:#444;line-height:1.5;">Click the button below to confirm you control <strong>' + email + '</strong> and claim this launch on Launch.</p>' +
      '<p style="margin:24px 0;"><a href="' + verifyUrl + '" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Verify and claim</a></p>' +
      '<p style="color:#888;font-size:13px;">This link expires in 24 hours. If you didn\'t request this, ignore this email.</p>' +
      '<p style="color:#888;font-size:13px;word-break:break-all;">Or paste this link: ' + verifyUrl + '</p>' +
      '</div>';

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const sendRes = await resend.emails.send({
      from: "Launch <noreply@trylaunch.ai>",
      to: [email],
      subject: "Verify your claim of " + (product.name || "your launch") + " on Launch",
      html,
    });
    console.log("claim verification email sent", sendRes);

    return new Response(JSON.stringify({ success: true, email }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("request-product-claim error", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
