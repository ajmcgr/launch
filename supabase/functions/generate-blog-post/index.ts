// SINGLE FILE ON PURPOSE: deployed by pasting index.ts into the Supabase
// dashboard editor, which does not upload sibling files. Any local import
// makes the bundle fail to boot and the endpoint hangs. Keep helpers inline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function unauthorizedResponse(headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// ------------------------------------------------- gemini blog artwork
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";
const BLOG_IMAGE_BUCKET = "blog-images";

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
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${GEMINI_BASE}/${path}?key=${key}`, {
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

async function buildImagePrompt(post: any): Promise<string> {
  const body = (post.content_md || "").replace(/\s+/g, " ").slice(0, 4000);
  const brief = `You are the art director for Launch, a premium publication for startup founders.

Article title: ${post.title}
Excerpt: ${post.excerpt || "(none)"}
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

async function attachImagesToPost(supabase: any, post: any) {
  try {
    const prompt = await buildImagePrompt(post);
    let image: { bytes: Uint8Array; mime: string } | null = null;
    let lastErr: unknown = null;
    for (let i = 0; i < 3; i++) {
      try {
        const json = await geminiJson(`${IMAGE_MODEL}:generateContent`, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        });
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const inline = parts.find((p: any) => p?.inlineData?.data)?.inlineData;
        if (!inline?.data) throw new Error("Gemini returned no image data");
        const bin = atob(inline.data);
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        image = { bytes, mime: inline.mimeType || "image/png" };
        break;
      } catch (err) {
        lastErr = err;
        console.error(`Gemini image attempt ${i + 1}/3 failed:`, err);
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
    if (!image) throw new Error(`Gemini image generation failed: ${lastErr}`);

    const when = post.published_at ? new Date(post.published_at) : new Date();
    const ext = image.mime.includes("jpeg") ? "jpg" : "png";
    const dir = `${when.getUTCFullYear()}/${String(when.getUTCMonth() + 1).padStart(2, "0")}/${post.slug}`;
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

    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({
        cover_image_url: urls.hero,
        card_image_url: urls.card,
        og_image_url: urls.og,
        image_prompt: prompt,
      })
      .eq("id", post.id);
    if (updateError) throw new Error(updateError.message);

    return { hero: urls.hero, card: urls.card, og: urls.og, prompt };
  } catch (err) {
    console.error(`Blog artwork failed for ${post.slug}:`, err);
    return null;
  }
}


function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function parseJsonContent(content: string): any {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callOpenAIJson(prompt: string, schemaName: string, schema: Record<string, unknown>): Promise<any> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You write practical SEO content for Launch. Return valid JSON only and follow the provided schema exactly.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, strict: true, schema },
      },
      temperature: 0.65,
      max_tokens: 8000,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${errText}`);
  }
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty response");
  return parseJsonContent(content);
}

async function generateBlogPost(requestBody: any) {
  try {
    const source = typeof requestBody?.source === "string" ? requestBody.source : "manual";
    const status = requestBody?.status === "draft" ? "draft" : "published";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Gather platform context: trending products this week, popular tags, popular categories
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [productsRes, tagsRes, categoriesRes, recentPostsRes] = await Promise.all([
      supabase
        .from("products")
        .select("name, tagline, slug, launch_date")
        .eq("status", "launched")
        .gte("launch_date", weekAgo)
        .order("launch_date", { ascending: false })
        .limit(15),
      supabase.from("product_tags").select("name, slug").limit(30),
      supabase.from("product_categories").select("name").limit(20),
      supabase
        .from("blog_posts")
        .select("title, topic_seed")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const trendingProducts = productsRes.data ?? [];
    const tags = tagsRes.data ?? [];
    const categories = categoriesRes.data ?? [];
    const recentTitles = (recentPostsRes.data ?? []).map((p) => p.title);

    // 2. Have AI pick a topic dynamically based on platform data
    const topicSelectionPrompt = `You are an SEO content strategist for Launch (trylaunch.ai), a product discovery platform for AI and tech products. It's a Product Hunt alternative.

Recent blog post titles (DO NOT duplicate these topics):
${recentTitles.map((t) => `- ${t}`).join("\n") || "(none yet)"}

Trending products launched this week on Launch:
${trendingProducts.map((p) => `- ${p.name}: ${p.tagline}`).join("\n")}

Popular tags on the platform: ${tags.map((t) => t.name).join(", ")}
Popular categories: ${categories.map((c) => c.name).join(", ")}

Pick ONE blog post topic that:
1. Targets a high-intent SEO keyword (founders/indie hackers/makers searching Google)
2. Is genuinely useful, not generic listicle filler
3. Naturally links to Launch products, categories, or tags
4. Has search demand (e.g., "how to launch on product hunt", "best AI tools for X", "indie hacker revenue strategies", "[trending category] tools 2026")
5. Is fresh — different angle from recent posts above

Pick the topic now.`;

    const topic = await callOpenAIJson(topicSelectionPrompt, "select_topic", {
      type: "object",
      properties: {
        title: { type: "string", description: "SEO-optimized blog post title (50-65 chars)" },
        target_keyword: { type: "string", description: "Primary SEO keyword to rank for" },
        angle: { type: "string", description: "The unique angle / hook for this article" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "3-5 topic tags",
        },
      },
      required: ["title", "target_keyword", "angle", "tags"],
      additionalProperties: false,
    });
    console.log("Selected topic:", topic);

    // 3. Generate the full article
    const articlePrompt = `Write a complete, publish-ready SEO blog post for Launch (trylaunch.ai), a Product Hunt alternative for AI and tech products.

TITLE: ${topic.title}
TARGET KEYWORD: ${topic.target_keyword}
ANGLE: ${topic.angle}

QUALITY BAR (match this style — practical SEO content, similar to rankinpublic.xyz/blog):
- Plain-spoken, confident, direct. Short sentences. No fluff, no marketing jargon, no "In today's fast-paced world".
- Open with a concrete problem the reader feels (e.g. "Launching a new startup feels hard when no one knows your product exists.").
- Teach by example. Each section should answer one specific sub-question and give the reader something they can do today.
- Use simple language a non-native English founder can read easily. Vary sentence length. No purple prose.

STRUCTURE:
- 1400-1900 words total.
- Markdown only. Use ## for H2 sections and ### for H3 sub-sections. 8-12 H2 sections.
- First H2 should define the core concept ("What Is …"), then sections covering: why it matters, how to do it step by step, what to avoid, examples, and a final action-oriented section.
- Use short bulleted lists (3-6 items) where they help scannability. Bold key terms sparingly.
- Include the target keyword in: the H1 title, the first 100 words, at least one H2, and naturally 4-6 times across the body. Never keyword-stuff.
- Add an FAQ section near the end with 3-4 H3 questions and 2-3 sentence answers (great for SEO snippets).
- Final section should be a specific action heading (e.g. "Start Your Launch This Week"), NOT "Conclusion". End with a clear CTA paragraph linking to https://trylaunch.ai/submit.

INTERNAL LINKS (use as natural inline markdown links, not a link dump):
- https://trylaunch.ai/products (browse all products)
- https://trylaunch.ai/launches/today (today's launches)
- https://trylaunch.ai/submit (submit a product)
- https://trylaunch.ai/product-hunt-alternative (PH alternative page)
- https://trylaunch.ai/makers (top makers leaderboard)
- https://trylaunch.ai/pricing (Pro and Pass plans)
- Tag pages like https://trylaunch.ai/tag/[slug] using these real tags: ${tags.slice(0, 15).map((t) => t.slug).join(", ")}

REAL EXAMPLES — reference 2-3 of these trending products by name with a link, where it fits naturally:
${trendingProducts.slice(0, 8).map((p) => `  * ${p.name} (https://trylaunch.ai/launch/${p.slug}): ${p.tagline}`).join("\n")}

STRICT RULES:
- NO emojis anywhere.
- NO "Conclusion" header.
- NO promotional hype about Launch in every section — mention it where it earns its place.
- content_md MUST be RAW markdown only. Do NOT wrap in triple backticks/quotes. Do NOT prefix with "\`\`\`markdown". Start directly with the first paragraph or heading. Use real newline characters with a blank line between blocks.

Also produce: a 50-65 char meta_title, a 150-160 char meta_description, a 120-160 char excerpt, and a URL-friendly slug.

Return everything via the tool call.`;

    const article = await callOpenAIJson(articlePrompt, "publish_article", {
      type: "object",
      properties: {
        slug: { type: "string", description: "URL slug, lowercase-with-dashes, max 80 chars" },
        title: { type: "string" },
        meta_title: { type: "string", description: "SEO title tag, 50-65 chars" },
        meta_description: { type: "string", description: "Meta description, 150-160 chars" },
        excerpt: { type: "string", description: "Card preview, 120-160 chars" },
        content_md: { type: "string", description: "Full markdown article with real newlines and blank lines between blocks." },
      },
      required: ["slug", "title", "meta_title", "meta_description", "excerpt", "content_md"],
      additionalProperties: false,
    });

    // Strip any accidental wrapping fences/quotes from the markdown body.
    // Models sometimes wrap output in ```, ```markdown, ''', """, or even '''markdown.
    if (typeof article.content_md === "string") {
      let md = article.content_md.trim();
      // Run a few passes to peel off layered wrappers
      for (let i = 0; i < 5; i++) {
        const before = md;
        // Opening fence: ```, ''', """ (3+) optionally followed by 'markdown'/'md'
        md = md.replace(/^(?:`{3,}|'{3,}|"{3,})\s*(?:markdown|md)?\s*\r?\n?/i, "");
        // Trailing fence (3+)
        md = md.replace(/\r?\n?\s*(?:`{3,}|'{3,}|"{3,})\s*\.?\s*$/i, "");
        // Stray trailing fence with punctuation glued on (e.g. ". '''")
        md = md.replace(/[\s.]*(?:`{3,}|'{3,}|"{3,})\s*$/i, "");
        // Single/double stray matching quote wrappers around the WHOLE body
        if (/^["'](.|\n)+["']$/.test(md)) {
          const first = md[0];
          const last = md[md.length - 1];
          if (first === last) md = md.slice(1, -1).trim();
        }
        md = md.trim();
        if (md === before) break;
      }
      // Convert literal escape sequences to real characters (model sometimes
      // returns "\n" as the two-character string instead of a real newline).
      if (!md.includes("\n") || /\\n/.test(md)) {
        md = md.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "  ");
      }
      // Ensure markdown block elements that ended up inline get their own line.
      // If headings (##, ###) or list markers appear mid-paragraph, insert breaks.
      md = md.replace(/([^\n])\s+(#{1,6}\s)/g, "$1\n\n$2");
      md = md.replace(/(#{1,6}[^\n]+?)\s+([A-Z][^\n#]*?)(?=\s+#{1,6}\s|$)/g, "$1\n\n$2");
      // Blank line after headings
      md = md.replace(/^(#{1,6}[^\n]+)\n(?!\n)/gm, "$1\n\n");
      // Break before numbered list items that got glued inline: " 1. " -> "\n1. "
      md = md.replace(/([.!?])\s+(\d{1,2}\.\s+\*\*)/g, "$1\n\n$2");
      // Collapse 3+ blank lines
      md = md.replace(/\n{3,}/g, "\n\n");
      article.content_md = md.trim();
    }

    // Validation: refuse to publish empty/tiny articles
    if (!article.content_md || article.content_md.trim().length < 500) {
      throw new Error(
        `Generated content too short (${article.content_md?.length ?? 0} chars). Refusing to publish.`,
      );
    }

    // Ensure slug uniqueness
    let finalSlug = slugify(article.slug || article.title);
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
    }

    // 4. Artwork is generated with Gemini AFTER insert (see below) so a slow or
    // failing image pipeline can never block publishing.


    const publishedAt = status === "published" ? new Date().toISOString() : null;

    // 4. Insert and auto-publish by default; callers can explicitly request draft.
    const { data: inserted, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug: finalSlug,
        title: article.title,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        excerpt: article.excerpt,
        content_md: article.content_md,
        cover_image_url: null,
        tags: topic.tags,
        topic_seed: topic.target_keyword,
        ai_generated: true,
        status,
        published_at: publishedAt,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log("Generated blog post:", inserted.slug, status);

    // 5. Generate Gemini artwork (hero / card / og) and attach it to the post.
    // Never fatal: a failure leaves the branded placeholder in place.
    const images = await attachImagesToPost(supabase, inserted);

    // 6. Opportunistic sweep: re-image up to 2 older posts that still have no
    // Gemini artwork (image_prompt is only ever set by the image pipeline), so
    // the archive heals itself without any manual backfill button.
    try {
      const { data: stale } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, content_md, tags, published_at")
        .is("image_prompt", null)
        .neq("id", inserted.id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(2);
      for (const post of stale || []) {
        try {
          await attachImagesToPost(supabase, post);
          console.log("Re-imaged older post:", post.slug);
        } catch (err) {
          console.error("Re-image failed for", post.slug, err);
        }
      }
    } catch (err) {
      console.error("Artwork sweep failed:", err);
    }


    return {
      success: true,
      slug: inserted.slug,
      title: inserted.title,
      status: inserted.status,
      cover_image_url: images?.hero ?? null,
      url: `https://trylaunch.ai/blog/${inserted.slug}`,
    };
  } catch (err) {
    console.error("generate-blog-post error:", err);
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!isCronAuthorized(req)) {
    return unauthorizedResponse(corsHeaders);
  }

  try {
    const requestBody = await req.json().catch(() => ({}));
    const source = typeof requestBody?.source === "string" ? requestBody.source : "manual";

    if (source === "cron") {
      const job = generateBlogPost({ ...requestBody, source: "cron" });
      const observedJob = job
        .then((result) => {
          console.log("Queued cron blog generation finished:", result);
          return result;
        })
        .catch((err) => {
          console.error("Queued cron blog generation failed:", err);
          throw err;
        });
      const edgeRuntime = (globalThis as any).EdgeRuntime;

      if (typeof edgeRuntime?.waitUntil === "function") {
        edgeRuntime.waitUntil(observedJob);
        return new Response(
          JSON.stringify({ success: true, queued: true, status: "accepted" }),
          { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await observedJob;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await generateBlogPost(requestBody);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-blog-post request error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
