// Generate (or regenerate) Gemini artwork for blog posts.
//
// SINGLE FILE ON PURPOSE: this function is deployed by pasting index.ts into the
// Supabase dashboard editor, which does not upload sibling files. Any local
// import (./blog-image.ts, ../_shared/...) makes the bundle fail to boot and the
// endpoint hangs with no response at all. Keep everything inline.
//
// Modes:
//   { postId } | { slug }            -> single post
//   { backfill: true, limit, force } -> batch over posts missing artwork
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------------------------------------------------------- auth
function isCronAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const cronSecretHeader = req.headers.get("x-cron-secret") || req.headers.get("X-Cron-Secret") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const expectedCronSecret = Deno.env.get("CRON_SECRET") || "";
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) return true;
  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) return true;
  return false;
}

// Allow signed-in admins (the /admin Blog tab) to trigger runs with their JWT.
async function isAdminAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error } = await admin.auth.getUser(token);
    if (error || !userData?.user) return false;
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    return !!roleData;
  } catch {
    return false;
  }
}


// ---------------------------------------------------------------- gemini
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";
const BLOG_IMAGE_BUCKET = "blog-images";

interface BlogPostLike {
  slug: string;
  title: string;
  excerpt?: string | null;
  content_md?: string | null;
  tags?: string[] | null;
  category?: string | null;
  published_at?: string | null;
}

function apiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY missing");
  return key;
}

const STYLE_GUIDE = [
  "Wide 16:9 widescreen editorial cover.",
  "Consistent Launch brand visual identity: premium SaaS, modern, minimal, editorial.",
  "Abstract conceptual composition (never literal), bold geometric forms, soft layered gradients,",
  "high contrast, generous negative space, subtle depth and light, refined professional art direction.",
  "Palette: deep near-black and off-white base with a confident accent (electric blue / violet / warm amber).",
  "Strictly avoid: any text, letters, words, numbers, watermarks, logos, UI screenshots, clipart,",
  "stock-photo people, generic robots, brains, circuit-board cliches, low-quality AI artefacts, random icons.",
].join(" ");

async function geminiJson(path: string, body: unknown, timeoutMs = 60_000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${GEMINI_BASE}/${path}?key=${apiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      throw new Error(`Gemini ${path} ${resp.status}: ${(await resp.text()).slice(0, 400)}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

async function buildImagePrompt(post: BlogPostLike): Promise<string> {
  const body = (post.content_md || "").replace(/\s+/g, " ").slice(0, 4000);
  const brief = `You are the art director for Launch, a premium publication for startup founders.

Article title: ${post.title}
Excerpt: ${post.excerpt || "(none)"}
Category: ${post.category || "(infer it)"}
Tags: ${(post.tags || []).join(", ") || "(none)"}
Article body (truncated): ${body}

Write ONE image-generation prompt (max 60 words) for an abstract editorial cover illustration that expresses
the article's core idea — not its title text. Describe subject matter, composition and mood only.
Do not mention text, typography, letters or logos. Output the prompt sentence only, no preamble.`;

  try {
    const json = await geminiJson(`${TEXT_MODEL}:generateContent`, {
      contents: [{ role: "user", parts: [{ text: brief }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 400 },
    }, 30_000);
    const text: string = (json?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text || "")
      .join(" ")
      .trim();
    if (text && text.length > 20) return `${text} ${STYLE_GUIDE}`;
  } catch (err) {
    console.error("Prompt generation failed, falling back:", err);
  }
  return `Abstract editorial cover illustration expressing the idea of "${post.title}" for startup founders. ${STYLE_GUIDE}`;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function generateBaseImage(prompt: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const json = await geminiJson(`${IMAGE_MODEL}:generateContent`, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((p: any) => p?.inlineData?.data)?.inlineData;
  if (!inline?.data) {
    throw new Error(`Gemini returned no image data: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return { bytes: b64ToBytes(inline.data), mime: inline.mimeType || "image/png" };
}

async function generateAndStoreBlogImages(supabase: any, post: BlogPostLike) {
  const attempts = 3;
  const prompt = await buildImagePrompt(post);

  let image: { bytes: Uint8Array; mime: string } | null = null;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      image = await generateBaseImage(prompt);
      break;
    } catch (err) {
      lastErr = err;
      console.error(`Gemini image attempt ${i + 1}/${attempts} failed:`, err);
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  if (!image) throw new Error(`Gemini image generation failed: ${lastErr}`);

  const when = post.published_at ? new Date(post.published_at) : new Date();
  const ext = image.mime.includes("jpeg") ? "jpg" : "png";
  const dir = `${when.getUTCFullYear()}/${String(when.getUTCMonth() + 1).padStart(2, "0")}/${post.slug}`;

  // The Gemini render is already a wide 16:9 editorial cover, so hero / card / og
  // share the same source bytes (crawlers and CSS handle the cropping).
  const urls: Record<string, string> = {};
  const version = Date.now().toString(36);
  for (const name of ["hero", "card", "og"]) {
    const path = `${dir}/${name}.${ext}`;
    const { error } = await supabase.storage.from(BLOG_IMAGE_BUCKET).upload(path, image.bytes, {
      contentType: image.mime,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw new Error(`Upload failed (${path}): ${error.message}`);
    const { data } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(path);
    urls[name] = `${data.publicUrl}?v=${version}`;
  }

  return { hero: urls.hero, card: urls.card, og: urls.og, prompt };
}

async function attachImagesToPost(supabase: any, post: BlogPostLike & { id: string }) {
  const set = await generateAndStoreBlogImages(supabase, post);
  const { error } = await supabase
    .from("blog_posts")
    .update({
      cover_image_url: set.hero,
      card_image_url: set.card,
      og_image_url: set.og,
      image_prompt: set.prompt,
    })
    .eq("id", post.id);
  if (error) throw new Error(error.message);
  return set;
}

// ---------------------------------------------------------------- handler
const SELECT = "id, slug, title, excerpt, content_md, tags, published_at";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!isCronAuthorized(req) && !(await isAdminAuthorized(req))) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({} as any));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (body?.backfill || body?.auto) {
      // Keep batches small: each render takes ~15-30s and the edge runtime caps
      // wall-clock time per invocation.
      const limit = Math.min(Number(body.limit) || 3, 4);

      let query = supabase
        .from("blog_posts")
        .select(SELECT)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      // image_prompt is only set by this function, so "no prompt" == "not Gemini
      // artwork yet" (covers both null covers and the old default cover image).
      if (!body.force) query = query.is("image_prompt", null);


      const { data: posts, error } = await query;
      if (error) throw error;

      const results: Array<{ slug: string; ok: boolean; error?: string }> = [];
      for (const post of posts || []) {
        try {
          await attachImagesToPost(supabase, post as any);
          results.push({ slug: (post as any).slug, ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Blog artwork failed for ${(post as any).slug}:`, message);
          results.push({ slug: (post as any).slug, ok: false, error: message });
        }
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
    return json({ success: true, slug: (data as any).slug, ...set });
  } catch (err) {
    console.error("generate-blog-image error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
