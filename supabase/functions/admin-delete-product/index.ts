import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // --- Authenticate caller ---
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Missing authorization header" }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const caller = userData?.user;
    if (userErr || !caller) return json({ error: "Invalid session" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin privileges required" }, 403);

    // --- Resolve target product ---
    const body = await req.json().catch(() => ({}));
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!productId && !slug) return json({ error: "productId or slug is required" }, 400);

    let target: { id: string; name: string | null; slug: string | null } | null = null;
    if (productId) {
      const { data } = await admin.from("products").select("id, name, slug").eq("id", productId).maybeSingle();
      target = data;
    } else {
      const { data } = await admin.from("products").select("id, name, slug").eq("slug", slug).maybeSingle();
      target = data;
    }
    if (!target) return json({ error: "Product not found" }, 404);

    const pid = target.id;

    // --- Remove dependent rows (best effort; ignore missing tables) ---
    const cleanups: Array<[string, string]> = [
      ["product_media", "product_id"],
      ["product_categories", "product_id"],
      ["stack_items", "product_id"],
      ["product_makers", "product_id"],
      ["votes", "product_id"],
      ["comments", "product_id"],
      ["product_ratings", "product_id"],
      ["product_analytics", "product_id"],
      ["product_views", "product_id"],
      ["orders", "product_id"],
      ["sponsored_products", "product_id"],
      ["collection_items", "product_id"],
      ["notifications", "product_id"],
      ["product_claims", "product_id"],
      ["reports", "product_id"],
      ["achievements", "product_id"],
      ["digest_sends", "product_id"],
    ];

    const failures: string[] = [];
    for (const [table, column] of cleanups) {
      const { error } = await admin.from(table).delete().eq(column, pid);
      if (error && !/does not exist|schema cache/i.test(error.message)) {
        failures.push(`${table}.${column}: ${error.message}`);
      }
    }

    const { error: productErr } = await admin.from("products").delete().eq("id", pid);
    if (productErr) return json({ error: `Product delete failed: ${productErr.message}`, failures }, 500);

    console.log(`admin ${caller.id} deleted product ${pid} (${target.slug})`);
    return json({ success: true, deleted: { id: pid, name: target.name, slug: target.slug }, warnings: failures });
  } catch (e) {
    console.error("admin-delete-product error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
