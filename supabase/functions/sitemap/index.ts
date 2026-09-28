import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

const SITE_URL = "https://trylaunch.ai";
const INDEXABLE_BUILT_WITH_SLUGS = [
  "lovable", "cursor", "bolt", "replit", "claude-code", "codex",
  "google-ai-studio", "base44", "clonk", "rork", "v0",
];
const MIN_INDEXABLE_BUILT_WITH_PRODUCTS = 8;
const MIN_INDEXABLE_TAG_PRODUCTS = 8;
const MIN_INDEXABLE_CATEGORY_PRODUCTS = 5;
const MIN_INDEXABLE_COLLECTION_PRODUCTS = 5;
const PAGE_SIZE = 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Supabase caps a single response at 1,000 rows. Keep the sitemap complete
    // as the launch directory grows beyond that default page size.
    const products: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, created_at, launch_date")
        .eq("status", "launched")
        .order("launch_date", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      products.push(...(data ?? []));
      if ((data?.length ?? 0) < PAGE_SIZE) break;
    }

    const fetchAll = async (query: any) => {
      const rows: any[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < PAGE_SIZE) break;
      }
      return rows;
    };

    // These are a curated subset of stack values. The broader stack parser accepts
    // free-form input, so only recognized app-building platforms are sitemap SEO pages.
    const { data: builtWithItems } = await supabase
      .from("stack_items")
      .select("id, slug")
      .in("slug", INDEXABLE_BUILT_WITH_SLUGS);
    const builtWithIds = (builtWithItems ?? []).map((item: any) => item.id);
    const builtWithMappings = builtWithIds.length
      ? await fetchAll(supabase.from("product_stack_map").select("stack_item_id, product_id").in("stack_item_id", builtWithIds).order("stack_item_id"))
      : [] as any[];
    const launchedProductIds = new Set(products.map((product: any) => product.id));
    const builtWithCounts = new Map<number, number>();
    (builtWithMappings ?? []).forEach((mapping: any) => {
      if (!launchedProductIds.has(mapping.product_id)) return;
      builtWithCounts.set(mapping.stack_item_id, (builtWithCounts.get(mapping.stack_item_id) ?? 0) + 1);
    });

    // Fetch the complete tag and mapping sets. Supabase otherwise returns only
    // its default first 1,000 rows, silently dropping valid sitemap URLs.
    const tags = await fetchAll(supabase
      .from("product_tags")
      .select("id, slug")
      .order("id"));
    const tagMappings = await fetchAll(supabase
      .from("product_tag_map")
      .select("tag_id, product_id")
      .order("tag_id"));
    const tagCounts = new Map<number, number>();
    tagMappings.forEach((mapping: any) => {
      if (!launchedProductIds.has(mapping.product_id)) return;
      tagCounts.set(mapping.tag_id, (tagCounts.get(mapping.tag_id) ?? 0) + 1);
    });

    const categories = await fetchAll(supabase
      .from("product_categories")
      .select("id, name")
      .order("id"));
    const categoryMappings = await fetchAll(supabase
      .from("product_category_map")
      .select("category_id, product_id")
      .order("category_id"));
    const categoryCounts = new Map<number, number>();
    categoryMappings.forEach((mapping: any) => {
      if (!launchedProductIds.has(mapping.product_id)) return;
      categoryCounts.set(mapping.category_id, (categoryCounts.get(mapping.category_id) ?? 0) + 1);
    });

    // Fetch all curated collections
    const collections = await fetchAll(supabase
      .from("collections")
      .select("id, slug, updated_at")
      .order("id"));

    // Fetch all public user_collections (community-created)
    const userCollections = await fetchAll((supabase as any)
      .from("user_collections")
      .select("id, slug, description, updated_at")
      .eq("is_public", true)
      .order("id"));

    // Item counts to filter empty collections from sitemap
    const curatedIds = new Set((collections ?? []).map((c: any) => c.id));
    const userColIds = new Set((userCollections ?? []).map((c: any) => c.id));

    // Do not use `.in()` with every public collection ID: thousands of IDs make
    // a URL larger than PostgREST accepts. These join tables are small enough to
    // page through, then filter to the public collections in memory.
    const [curatedItems, userItems] = await Promise.all([
      curatedIds.size
        ? fetchAll(supabase.from("collection_products").select("collection_id, product_id").order("collection_id"))
        : Promise.resolve([] as any[]),
      userColIds.size
        ? fetchAll((supabase as any).from("user_collection_items").select("collection_id, product_id").order("collection_id"))
        : Promise.resolve([] as any[]),
    ]);

    const curatedCounts = new Map<string, number>();
    curatedItems.forEach((item: any) => {
      if (!curatedIds.has(item.collection_id)) return;
      if (!launchedProductIds.has(item.product_id)) return;
      curatedCounts.set(item.collection_id, (curatedCounts.get(item.collection_id) ?? 0) + 1);
    });
    const userCounts = new Map<string, number>();
    userItems.forEach((item: any) => {
      if (!userColIds.has(item.collection_id)) return;
      if (!launchedProductIds.has(item.product_id)) return;
      userCounts.set(item.collection_id, (userCounts.get(item.collection_id) ?? 0) + 1);
    });

    // Fetch all published blog posts
    const blogPosts = await fetchAll((supabase as any)
      .from("blog_posts")
      .select("slug, published_at, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false }));

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
      { loc: "/vibecoders", priority: "0.8", changefreq: "weekly" },
      { loc: "/tech", priority: "0.8", changefreq: "weekly" },
      { loc: "/categories", priority: "0.7", changefreq: "weekly" },
      { loc: "/tags", priority: "0.7", changefreq: "weekly" },
      { loc: "/awards", priority: "0.7", changefreq: "weekly" },
      { loc: "/success-stories", priority: "0.7", changefreq: "monthly" },
      { loc: "/collections", priority: "0.7", changefreq: "weekly" },
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
      { loc: "/ai-info", priority: "0.7", changefreq: "monthly" },
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
        if (!product.slug) continue;
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

    // Add only the curated built-with pages that have enough real product inventory.
    for (const item of builtWithItems ?? []) {
      if ((builtWithCounts.get(item.id) ?? 0) < MIN_INDEXABLE_BUILT_WITH_PRODUCTS) continue;
      xml += `
  <url>
    <loc>${SITE_URL}/tech/${item.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Add tags
    if (tags) {
      for (const tag of tags) {
        if ((tagCounts.get(tag.id) ?? 0) < MIN_INDEXABLE_TAG_PRODUCTS) continue;
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
        if ((categoryCounts.get(category.id) ?? 0) < MIN_INDEXABLE_CATEGORY_PRODUCTS) continue;
        const slug = createSlug(category.name);
        xml += `
  <url>
    <loc>${SITE_URL}/category/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    // Add curated collections (only those with >=1 product)
    if (collections) {
      for (const collection of collections) {
        if ((curatedCounts.get(collection.id) ?? 0) < MIN_INDEXABLE_COLLECTION_PRODUCTS) continue;
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

    // Add public community collections (only those with >=1 item)
    if (userCollections) {
      for (const collection of userCollections) {
        if ((userCounts.get(collection.id) ?? 0) < MIN_INDEXABLE_COLLECTION_PRODUCTS) continue;
        if (!collection.description?.trim()) continue;
        const lastmod = collection.updated_at;
        xml += `
  <url>
    <loc>${SITE_URL}/collections/${collection.slug}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
