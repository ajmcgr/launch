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
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch product details
    const { data: product, error } = await supabase
      .from("products")
      .select("id, name, tagline, slug, description")
      .eq("slug", slug)
      .eq("status", "launched")
      .single();

    if (error || !product) {
      // Redirect to homepage if product not found
      return new Response(null, {
        status: 302,
        headers: { Location: "https://trylaunch.ai" },
      });
    }

    // Fetch product media - first screenshot, then icon as fallback
    const { data: media } = await supabase
      .from("product_media")
      .select("url, type")
      .eq("product_id", product.id)
      .in("type", ["screenshot", "icon"])
      .not("url", "is", null)
      .order("type", { ascending: false }) // screenshot before icon alphabetically reversed
      .limit(10);

    // Prefer screenshot, fall back to icon, then default
    const screenshot = media?.find((m: any) => m.type === "screenshot");
    const icon = media?.find((m: any) => m.type === "icon");
    const ogImage = screenshot?.url || icon?.url || "https://trylaunch.ai/social-card.png";

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
