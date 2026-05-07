import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // 4. Generate a cover image for the post. If the image cannot be created,
    // stop publishing so future blog posts never go live without artwork.
    let coverImageUrl: string | null = null;
    try {
      const imagePrompt = `Editorial blog cover illustration for an article titled "${article.title}". Topic: ${topic.angle}. Style: modern, minimal, clean tech editorial illustration with bold geometric shapes and a confident color palette. No text, no words, no letters, no logos. Wide 16:9 composition suitable for a blog header.`;

      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResp.ok) {
        throw new Error(`Image generation failed: ${imgResp.status} ${await imgResp.text()}`);
      }

      const imgData = await imgResp.json();
      const dataUrl: string | undefined =
        imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl?.startsWith("data:image/")) {
        throw new Error("Image generation returned no image data");
      }

      // Parse data URL: data:image/png;base64,XXXX
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) throw new Error("Image generation returned an invalid image data URL");

      const mime = match[1];
      const ext = mime.split("/")[1].replace("jpeg", "jpg");
      const b64 = match[2];
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${finalSlug}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("blog-images")
        .upload(path, bytes, { contentType: mime, upsert: true });
      if (uploadErr) {
        throw new Error(`Image upload failed: ${uploadErr.message}`);
      }

      const { data: pub } = supabase.storage.from("blog-images").getPublicUrl(path);
      coverImageUrl = pub.publicUrl;
      if (!coverImageUrl) {
        throw new Error("Image upload completed without a public URL");
      }
    } catch (imgErr) {
      console.error("Cover image generation error (continuing without cover):", imgErr);
      coverImageUrl = null;
    }

    const requestedStatus = (await req.clone().json().catch(() => ({})))?.status;
    const status = requestedStatus === "published" ? "published" : "draft";
    const publishedAt = status === "published" ? new Date().toISOString() : null;

    // 4. Insert as a draft by default; callers can explicitly request publish.
    const { data: inserted, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug: finalSlug,
        title: article.title,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        excerpt: article.excerpt,
        content_md: article.content_md,
        cover_image_url: coverImageUrl,
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

    return new Response(
      JSON.stringify({
        success: true,
        slug: inserted.slug,
        title: inserted.title,
        status: inserted.status,
        url: `https://trylaunch.ai/blog/${inserted.slug}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-blog-post error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
