import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Tolerate pasted variants: trailing slashes, full URLs, stray whitespace
    const rawSlug = url.searchParams.get("slug") || "";
    const slug = rawSlug.trim().replace(/^.*\/launch\//, "").replace(/[/?#].*$/, "");

    if (!slug) {
      return new Response("Missing slug", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch product details.
    // No status filter: products shared before/around go-live must still
    // resolve, otherwise the share link dumps people on the homepage.
    const { data: product, error } = await supabase
      .from("products")
      .select("id, name, tagline, slug, description")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !product) {
      // Still send people to the product page — only fall back to the
      // homepage when we have no slug at all.
      return new Response(null, {
        status: 302,
        headers: {
          Location: slug
            ? `https://trylaunch.ai/launch/${encodeURIComponent(slug)}`
            : "https://trylaunch.ai",
        },
      });
    }

    // Fetch product media — oldest first so "first screenshot" is stable
    const { data: media } = await supabase
      .from("product_media")
      .select("url, type, created_at")
      .eq("product_id", product.id)
      .in("type", ["screenshot", "icon"])
      .not("url", "is", null)
      .order("created_at", { ascending: true })
      .limit(20);

    const screenshot = media?.find((m: any) => m.type === "screenshot" && m.url);
    const icon = media?.find((m: any) => m.type === "icon" && m.url);

    // Priority: first screenshot -> thumbnail -> icon -> default Launch card
    const rawImage =
      screenshot?.url ||
      icon?.url ||
      "https://trylaunch.ai/social-card.png";

    // Crawlers require absolute URLs
    const ogImage = /^https?:\/\//i.test(rawImage)
      ? rawImage
      : `https://trylaunch.ai${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

    const canonicalUrl = `https://trylaunch.ai/launch/${product.slug}`;
    const title = `${product.name} - Launch AI`;
    const description = product.tagline || product.description?.substring(0, 160) || "Discover this product on Launch";


    // Serve HTML with correct OG tags + immediate redirect for humans
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Launch" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:site" content="@trylaunchai" />
  
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(product.name)} on Launch</a>...</p>
  <script>window.location.href="${escapeJs(canonicalUrl)}";</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("OG share error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: "https://trylaunch.ai" },
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJs(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\\/g, "\\\\");
}
