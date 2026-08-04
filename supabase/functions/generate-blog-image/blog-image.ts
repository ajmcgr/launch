// Shared Gemini-powered blog artwork pipeline.
// Generates one on-brand editorial image per article and stores the
// hero / card / open-graph renditions in the `blog-images` bucket.
//
// Provider: Google Gemini ONLY (GEMINI_API_KEY). No other image provider.
// NOTE: intentionally dependency-free (no imagescript/WASM) — the edge
// runtime stalled while fetching the WASM decoder, which silently killed
// every generation run.

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

export const BLOG_IMAGE_BUCKET = "blog-images";

/** Branded fallback used when Gemini is unavailable after retries. */
export const PLACEHOLDER_IMAGE_URL = "https://trylaunch.ai/social-card.png";

export interface BlogImageSet {
  hero: string;
  card: string;
  og: string;
  prompt: string;
}

export interface BlogPostLike {
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

/** Derive a concise visual prompt from the article itself (not the raw title). */
export async function buildImagePrompt(post: BlogPostLike): Promise<string> {
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

async function generateBaseImage(
  prompt: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
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

/**
 * Generate + store the full artwork set for a post.
 * Retries Gemini automatically; throws only if every attempt fails.
 */
export async function generateAndStoreBlogImages(
  supabase: any,
  post: BlogPostLike,
  opts: { attempts?: number; prompt?: string } = {},
): Promise<BlogImageSet> {
  const attempts = opts.attempts ?? 3;
  const prompt = opts.prompt || (await buildImagePrompt(post));

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

  // The Gemini render is already a wide 16:9 editorial cover, so the hero,
  // card and OG renditions share the same source bytes (browsers/crawlers
  // crop via CSS + og:image ratios).
  const urls: Record<string, string> = {};
  const version = Date.now().toString(36);
  for (const name of ["hero", "card", "og"]) {
    const path = `${dir}/${name}.${ext}`;
    const { error } = await supabase.storage
      .from(BLOG_IMAGE_BUCKET)
      .upload(path, image.bytes, {
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

/** Generate artwork and persist the URLs onto the blog post row. */
export async function attachImagesToPost(
  supabase: any,
  post: BlogPostLike & { id: string },
): Promise<BlogImageSet | null> {
  try {
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
  } catch (err) {
    console.error(`Blog artwork failed for ${post.slug}:`, err);
    return null;
  }
}
