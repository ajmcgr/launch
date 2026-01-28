import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

const SITE_URL = "https://trylaunch.ai";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published products
    const { data: products } = await supabase
      .from("products")
      .select("slug, created_at, launch_date")
      .eq("status", "published")
      .order("launch_date", { ascending: false });

    // Fetch all tags
    const { data: tags } = await supabase
      .from("product_tags")
      .select("slug, created_at")
      .order("name");

    // Fetch all categories
    const { data: categories } = await supabase
      .from("product_categories")
      .select("id, name")
      .order("name");

    // Fetch all collections
    const { data: collections } = await supabase
      .from("collections")
      .select("slug, updated_at")
      .order("name");

    const createSlug = (name: string) => {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    // Static pages
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/products", priority: "0.9", changefreq: "daily" },
      { loc: "/product-hunt-alternative", priority: "0.8", changefreq: "monthly" },
      { loc: "/product-launch-platform", priority: "0.8", changefreq: "monthly" },
      { loc: "/about", priority: "0.5", changefreq: "monthly" },
      { loc: "/pricing", priority: "0.6", changefreq: "monthly" },
      { loc: "/faq", priority: "0.5", changefreq: "monthly" },
      { loc: "/advertise", priority: "0.5", changefreq: "monthly" },
      { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms", priority: "0.3", changefreq: "yearly" },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add static pages
    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Add products
    if (products) {
      for (const product of products) {
        const lastmod = product.launch_date || product.created_at;
        xml += `
  <url>
    <loc>${SITE_URL}/launch/${product.slug}</loc>
    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    // Add tags
    if (tags) {
      for (const tag of tags) {
        xml += `
  <url>
    <loc>${SITE_URL}/tag/${tag.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    // Add categories
    if (categories) {
      for (const category of categories) {
        const slug = createSlug(category.name);
        xml += `
  <url>
    <loc>${SITE_URL}/category/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    // Add collections
    if (collections) {
      for (const collection of collections) {
        const lastmod = collection.updated_at;
        xml += `
  <url>
    <loc>${SITE_URL}/collections/${collection.slug}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    return new Response(xml, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response("Error generating sitemap", { status: 500 });
  }
});
