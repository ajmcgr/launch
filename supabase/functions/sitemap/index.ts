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

    // Fetch all launched products (status='launched' is the active state, see Core memory)
    const { data: products } = await supabase
      .from("products")
      .select("slug, created_at, launch_date")
      .eq("status", "launched")
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

    // Fetch all curated collections
    const { data: collections } = await supabase
      .from("collections")
      .select("id, slug, updated_at")
      .order("name");

    // Fetch all public user_collections (community-created)
    const { data: userCollections } = await (supabase as any)
      .from("user_collections")
      .select("id, slug, updated_at")
      .eq("is_public", true);

    // Item counts to filter empty collections from sitemap
    const curatedIds = (collections ?? []).map((c: any) => c.id);
    const userColIds = (userCollections ?? []).map((c: any) => c.id);

    const [{ data: curatedItems }, { data: userItems }] = await Promise.all([
      curatedIds.length
        ? supabase.from("collection_products").select("collection_id").in("collection_id", curatedIds)
        : Promise.resolve({ data: [] as any[] }),
      userColIds.length
        ? (supabase as any).from("user_collection_items").select("collection_id").in("collection_id", userColIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const curatedCounts = new Set<string>();
    (curatedItems ?? []).forEach((r: any) => curatedCounts.add(r.collection_id));
    const userCounts = new Set<string>();
    (userItems ?? []).forEach((r: any) => userCounts.add(r.collection_id));

    // Fetch all published blog posts
    const { data: blogPosts } = await (supabase as any)
      .from("blog_posts")
      .select("slug, published_at, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    const createSlug = (name: string) => {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    // Generate archive dates (last 90 days)
    const generateArchiveDates = () => {
      const dates: string[] = [];
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    };

    // Generate archive weeks (last 12 weeks)
    const generateArchiveWeeks = () => {
      const weeks: { year: number; week: number }[] = [];
      const today = new Date();
      
      for (let i = 0; i < 12; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 7));
        const year = date.getFullYear();
        // Get ISO week number
        const startOfYear = new Date(year, 0, 1);
        const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        
        // Avoid duplicates
        if (!weeks.some(w => w.year === year && w.week === week)) {
          weeks.push({ year, week });
        }
      }
      return weeks;
    };

    const archiveDates = generateArchiveDates();
    const archiveWeeks = generateArchiveWeeks();

    // Static pages
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/products", priority: "0.9", changefreq: "daily" },
      { loc: "/launches/today", priority: "0.9", changefreq: "daily" },
      { loc: "/product-hunt-alternative", priority: "0.8", changefreq: "monthly" },
      // Programmatic SEO landing pages
      { loc: "/best-ai-tools", priority: "0.9", changefreq: "daily" },
      { loc: "/best-new-ai-tools", priority: "0.9", changefreq: "daily" },
      { loc: "/best-ai-productivity-tools", priority: "0.8", changefreq: "daily" },
      { loc: "/best-ai-marketing-tools", priority: "0.8", changefreq: "daily" },
      { loc: "/best-ai-coding-tools", priority: "0.8", changefreq: "daily" },
      { loc: "/best-ai-video-tools", priority: "0.8", changefreq: "daily" },
      { loc: "/best-ai-agents", priority: "0.8", changefreq: "daily" },
      { loc: "/ai-tools-for-founders", priority: "0.8", changefreq: "daily" },
      { loc: "/product-hunt-alternatives", priority: "0.8", changefreq: "monthly" },
      { loc: "/product-launch-platform", priority: "0.8", changefreq: "monthly" },
      { loc: "/product-launch-strategy", priority: "0.8", changefreq: "monthly" },
      { loc: "/compare", priority: "0.8", changefreq: "monthly" },
      { loc: "/compare/launch-vs-product-hunt", priority: "0.8", changefreq: "monthly" },
      { loc: "/compare/launch-vs-betalist", priority: "0.8", changefreq: "monthly" },
      { loc: "/compare/launch-vs-peerlist", priority: "0.8", changefreq: "monthly" },
      { loc: "/compare/launch-vs-uneed", priority: "0.8", changefreq: "monthly" },
      { loc: "/compare/launch-vs-g2", priority: "0.8", changefreq: "monthly" },
      { loc: "/compare/launch-vs-theresanaiforthat", priority: "0.8", changefreq: "monthly" },
      { loc: "/compare/launch-vs-hacker-news", priority: "0.8", changefreq: "monthly" },
      // High-intent SEO templates: Best / Vs / Alternatives
      { loc: "/best/launch-platforms", priority: "0.8", changefreq: "monthly" },
      { loc: "/best/ai-launch-tools-for-founders", priority: "0.8", changefreq: "monthly" },
      { loc: "/best/launch-checklist-tools", priority: "0.8", changefreq: "monthly" },
      { loc: "/best/launch-templates", priority: "0.8", changefreq: "monthly" },
      { loc: "/best/places-to-launch-saas", priority: "0.8", changefreq: "monthly" },
      { loc: "/best/places-to-launch-ai-product", priority: "0.8", changefreq: "monthly" },
      { loc: "/alternatives/product-hunt", priority: "0.8", changefreq: "monthly" },
      { loc: "/alternatives/betalist", priority: "0.7", changefreq: "monthly" },
      { loc: "/alternatives/hacker-news", priority: "0.7", changefreq: "monthly" },
      { loc: "/vs/launch-vs-betalist", priority: "0.7", changefreq: "monthly" },
      { loc: "/vs/launch-vs-peerlist", priority: "0.7", changefreq: "monthly" },
      { loc: "/vs/launch-vs-microlaunch", priority: "0.7", changefreq: "monthly" },
      // Free marketing tools hub + individual tools
      { loc: "/tools", priority: "0.8", changefreq: "weekly" },
      { loc: "/tools/tagline-generator", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/product-name-generator", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/launch-tweet-writer", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/launch-thread-generator", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/cold-dm-writer", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/show-hn-title-generator", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/reddit-post-drafter", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/linkedin-launch-post", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/founder-bio-generator", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/product-hunt-tagline", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/seo-title-optimizer", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/meta-description-writer", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/landing-page-headline-generator", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/email-subject-line-tester", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/newsletter-pitch-template", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/press-release-template", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/faq-generator", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/testimonial-request-email", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/utm-link-builder", priority: "0.7", changefreq: "monthly" },
      { loc: "/tools/launch-day-checklist", priority: "0.7", changefreq: "monthly" },
      // Vibe coding platform landing pages
      { loc: "/vibe-coding/codex", priority: "0.7", changefreq: "monthly" },
      { loc: "/vibe-coding/claude-code", priority: "0.7", changefreq: "monthly" },
      { loc: "/vibe-coding/lovable", priority: "0.7", changefreq: "monthly" },
      { loc: "/vibe-coding/bolt-new", priority: "0.7", changefreq: "monthly" },
      { loc: "/vibe-coding/cursor", priority: "0.7", changefreq: "monthly" },
      { loc: "/vibe-coding/base44", priority: "0.7", changefreq: "monthly" },
      { loc: "/vibe-coding/replit", priority: "0.7", changefreq: "monthly" },
      { loc: "/vibe-coding/v0", priority: "0.7", changefreq: "monthly" },
      { loc: "/vibe-coding/shipper", priority: "0.7", changefreq: "monthly" },
      { loc: "/about", priority: "0.5", changefreq: "monthly" },
      { loc: "/blog", priority: "0.8", changefreq: "weekly" },
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

    // Add daily archive pages
    for (const date of archiveDates) {
      xml += `
  <url>
    <loc>${SITE_URL}/launches/${date}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Add weekly archive pages
    for (const { year, week } of archiveWeeks) {
      const weekStr = week.toString().padStart(2, '0');
      xml += `
  <url>
    <loc>${SITE_URL}/launches/${year}/w${weekStr}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
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

    // Add blog posts
    if (blogPosts) {
      for (const post of blogPosts) {
        const lastmod = post.updated_at || post.published_at;
        xml += `
  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
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
