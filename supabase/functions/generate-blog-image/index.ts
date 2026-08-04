// Generate (or regenerate) Gemini artwork for blog posts.
// Modes:
//   { postId } | { slug }            -> single post
//   { backfill: true, limit, force } -> batch over posts missing artwork
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isCronAuthorized, unauthorizedResponse } from "./cron-auth.ts";
import { attachImagesToPost } from "./blog-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SELECT = "id, slug, title, excerpt, content_md, tags, published_at";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!isCronAuthorized(req)) return unauthorizedResponse(corsHeaders);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({} as any));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (body?.backfill) {
      // Keep batches small: each render takes ~15-30s and the edge runtime
      // caps wall-clock time per invocation.
      const limit = Math.min(Number(body.limit) || 3, 4);

      let query = supabase.from("blog_posts").select(SELECT).order("published_at", {
        ascending: false,
        nullsFirst: false,
      }).limit(limit);
      if (!body.force) query = query.is("cover_image_url", null);

      const { data: posts, error } = await query;
      if (error) throw error;

      const results: Array<{ slug: string; ok: boolean }> = [];
      for (const post of posts || []) {
        const set = await attachImagesToPost(supabase, post as any);
        results.push({ slug: (post as any).slug, ok: !!set });
      }
      return json({
        success: true,
        processed: results.length,
        succeeded: results.filter((r) => r.ok).length,
        results,
      });
    }

    let query = supabase.from("blog_posts").select(SELECT).limit(1);
    if (body?.postId) query = query.eq("id", body.postId);
    else if (body?.slug) query = query.eq("slug", body.slug);
    else return json({ error: "Provide postId, slug, or backfill: true" }, 400);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Post not found" }, 404);

    const set = await attachImagesToPost(supabase, data as any);
    if (!set) return json({ error: "Image generation failed after retries" }, 502);
    return json({ success: true, slug: (data as any).slug, ...set });
  } catch (err) {
    console.error("generate-blog-image error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
