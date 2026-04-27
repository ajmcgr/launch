import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function callAI(messages: any[], tools?: any[], toolChoice?: any): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const body: any = {
    model: "google/gemini-2.5-pro",
    messages,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${errText}`);
  }
  return await resp.json();
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

    const topicResp = await callAI(
      [{ role: "user", content: topicSelectionPrompt }],
      [
        {
          type: "function",
          function: {
            name: "select_topic",
            description: "Select a blog post topic with SEO keyword and angle",
            parameters: {
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
            },
          },
        },
      ],
      { type: "function", function: { name: "select_topic" } },
    );

    const topicCall = topicResp.choices?.[0]?.message?.tool_calls?.[0];
    if (!topicCall) throw new Error("AI failed to select topic");
    const topic = JSON.parse(topicCall.function.arguments);
    console.log("Selected topic:", topic);

    // 3. Generate the full article
    const articlePrompt = `Write a complete, publish-ready blog post for Launch (trylaunch.ai).

TITLE: ${topic.title}
TARGET KEYWORD: ${topic.target_keyword}
ANGLE: ${topic.angle}

REQUIREMENTS:
- 1500-2000 words
- Markdown format with ## H2 and ### H3 headings
- Engaging intro hook (no "In today's world...")
- Include 6-10 practical sections with actionable advice
- Naturally link to these Launch URLs where relevant (use markdown links):
  * https://trylaunch.ai/products (browse all products)
  * https://trylaunch.ai/launches/today (today's launches)
  * https://trylaunch.ai/submit (submit a product)
  * https://trylaunch.ai/product-hunt-alternative (PH alternative page)
  * https://trylaunch.ai/makers (top makers leaderboard)
  * Tag pages like https://trylaunch.ai/tag/[slug] using these real tags: ${tags.slice(0, 15).map((t) => t.slug).join(", ")}
- Reference 2-3 of these real trending products as examples where natural:
${trendingProducts.slice(0, 8).map((p) => `  * ${p.name} (https://trylaunch.ai/launch/${p.slug}): ${p.tagline}`).join("\n")}
- End with a clear CTA section linking to https://trylaunch.ai/submit
- Write in confident, direct voice for founders/indie hackers
- NO emojis in headings
- NO "Conclusion" header — call the final section something specific
- Include the target keyword naturally in: title, first paragraph, one H2, and 3-5x throughout
- CRITICAL: content_md must be RAW markdown only. Do NOT wrap the entire article in triple backticks (\`\`\`) or any code fence. Do NOT prefix with "```markdown". Start directly with the first paragraph or heading. Only use code fences for actual code snippets inside the article.

Also produce: a 150-160 char meta description, a 120-160 char excerpt, and a URL-friendly slug.

Return everything via the tool call.`;

    const articleResp = await callAI(
      [{ role: "user", content: articlePrompt }],
      [
        {
          type: "function",
          function: {
            name: "publish_article",
            description: "Publish the complete blog article",
            parameters: {
              type: "object",
              properties: {
                slug: { type: "string", description: "URL slug, lowercase-with-dashes, max 80 chars" },
                title: { type: "string" },
                meta_title: { type: "string", description: "SEO title tag, 50-65 chars" },
                meta_description: { type: "string", description: "Meta description, 150-160 chars" },
                excerpt: { type: "string", description: "Card preview, 120-160 chars" },
                content_md: { type: "string", description: "Full markdown article" },
              },
              required: ["slug", "title", "meta_title", "meta_description", "excerpt", "content_md"],
              additionalProperties: false,
            },
          },
        },
      ],
      { type: "function", function: { name: "publish_article" } },
    );

    const articleCall = articleResp.choices?.[0]?.message?.tool_calls?.[0];
    if (!articleCall) throw new Error("AI failed to generate article");
    const article = JSON.parse(articleCall.function.arguments);

    // Strip any accidental wrapping fences/quotes from the markdown body.
    // Models sometimes wrap output in ```, ```markdown, ''', """, or even '''markdown.
    if (typeof article.content_md === "string") {
      let md = article.content_md.trim();
      // Run a few passes to peel off layered wrappers
      for (let i = 0; i < 3; i++) {
        const before = md;
        // Opening fence: ```, ''', """ optionally followed by 'markdown'/'md'
        md = md.replace(/^(?:`{3,}|'{3,}|"{3,})\s*(?:markdown|md)?\s*\r?\n?/i, "");
        // Trailing fence
        md = md.replace(/\r?\n?\s*(?:`{3,}|'{3,}|"{3,})\s*\.?\s*$/i, "");
        // Stray trailing ''' or ``` even with punctuation glued on (e.g. ". '''")
        md = md.replace(/[\s.]*(?:`{3,}|'{3,}|"{3,})\s*$/i, "");
        md = md.trim();
        if (md === before) break;
      }
      article.content_md = md;
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

    // 4. Insert and auto-publish
    const { data: inserted, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug: finalSlug,
        title: article.title,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        excerpt: article.excerpt,
        content_md: article.content_md,
        tags: topic.tags,
        topic_seed: topic.target_keyword,
        ai_generated: true,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log("Published blog post:", inserted.slug);

    return new Response(
      JSON.stringify({
        success: true,
        slug: inserted.slug,
        title: inserted.title,
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
