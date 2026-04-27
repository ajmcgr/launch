import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateCoverImage(
  supabase: any,
  apiKey: string,
  slug: string,
  title: string,
  excerpt: string | null,
  tags: string[] | null,
): Promise<string | null> {
  const angle = excerpt || (tags && tags.length ? tags.join(", ") : title);
  const imagePrompt = `Editorial blog cover illustration for an article titled "${title}". Topic: ${angle}. Style: modern, minimal, clean tech editorial illustration with bold geometric shapes and a confident color palette. No text, no words, no letters, no logos. Wide 16:9 composition suitable for a blog header.`;

  const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: imagePrompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!imgResp.ok) {
    console.error("Image gen failed:", imgResp.status, await imgResp.text());
    return null;
  }

  const imgData = await imgResp.json();
  const dataUrl: string | undefined =
    imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl?.startsWith("data:image/")) return null;

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const mime = match[1];
  const ext = mime.split("/")[1].replace("jpeg", "jpg");
  const b64 = match[2];
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `${slug}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("blog-images")
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (uploadErr) {
    console.error("Upload failed:", uploadErr);
    return null;
  }
  const { data: pub } = supabase.storage.from("blog-images").getPublicUrl(path);
  return pub.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find posts missing cover images
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, tags")
      .or("cover_image_url.is.null,cover_image_url.eq.")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const results: { slug: string; ok: boolean; url?: string; error?: string }[] = [];

    for (const p of posts ?? []) {
      try {
        const url = await generateCoverImage(supabase, apiKey, p.slug, p.title, p.excerpt, p.tags);
        if (!url) {
          results.push({ slug: p.slug, ok: false, error: "image generation failed" });
          continue;
        }
        const { error: updErr } = await supabase
          .from("blog_posts")
          .update({ cover_image_url: url })
          .eq("id", p.id);
        if (updErr) {
          results.push({ slug: p.slug, ok: false, error: updErr.message });
          continue;
        }
        results.push({ slug: p.slug, ok: true, url });
        // Small spacing between gen calls
        await new Promise((r) => setTimeout(r, 600));
      } catch (e) {
        results.push({
          slug: p.slug,
          ok: false,
          error: e instanceof Error ? e.message : "unknown",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        succeeded: results.filter((r) => r.ok).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("backfill-blog-images error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
