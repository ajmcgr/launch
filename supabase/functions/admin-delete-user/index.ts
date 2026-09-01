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

    // --- Resolve target ---
    const body = await req.json().catch(() => ({}));
    const targetId = typeof body.userId === "string" ? body.userId.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!targetId && !username) return json({ error: "userId or username is required" }, 400);

    let target: { id: string; username: string | null } | null = null;
    if (targetId) {
      const { data } = await admin.from("users").select("id, username").eq("id", targetId).maybeSingle();
      target = data;
    } else {
      const { data } = await admin.from("users").select("id, username").ilike("username", username).maybeSingle();
      target = data;
    }
    if (!target) return json({ error: "User not found" }, 404);
    if (target.id === caller.id) return json({ error: "You cannot delete your own account here" }, 400);

    const uid = target.id;

    // --- Remove dependent rows (best effort; ignore missing tables) ---
    const cleanups: Array<[string, string]> = [
      ["votes", "user_id"],
      ["comments", "user_id"],
      ["product_ratings", "user_id"],
      ["notifications", "user_id"],
      ["notifications", "actor_id"],
      ["follows", "follower_id"],
      ["follows", "following_id"],
      ["collection_items", "added_by"],
      ["collection_collaborators", "user_id"],
      ["collections", "user_id"],
      ["user_roles", "user_id"],
      ["orders", "user_id"],
      ["products", "user_id"],
    ];

    const failures: string[] = [];
    for (const [table, column] of cleanups) {
      const { error } = await admin.from(table).delete().eq(column, uid);
      if (error && !/does not exist|schema cache/i.test(error.message)) {
        failures.push(`${table}.${column}: ${error.message}`);
      }
    }

    const { error: profileErr } = await admin.from("users").delete().eq("id", uid);
    if (profileErr) return json({ error: `Profile delete failed: ${profileErr.message}`, failures }, 500);

    const { error: authErr } = await admin.auth.admin.deleteUser(uid);
    if (authErr) return json({ error: `Auth delete failed: ${authErr.message}`, failures }, 500);

    console.log(`admin ${caller.id} deleted user ${uid} (${target.username})`);
    return json({ success: true, deleted: { id: uid, username: target.username }, warnings: failures });
  } catch (e) {
    console.error("admin-delete-user error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
