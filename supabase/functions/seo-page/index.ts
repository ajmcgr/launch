import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE = 'https://trylaunch.ai';
const DEFAULT_IMAGE = `${SITE}/social-card.jpg?v=5`;
const MIN_INDEXABLE_TAG_PRODUCTS = 8;
const MIN_INDEXABLE_CATEGORY_PRODUCTS = 5;
const MIN_INDEXABLE_COLLECTION_PRODUCTS = 5;
const INDEXABLE_STATIC_PAGES: Record<string, { title: string; description: string }> = {
  '/': { title: 'Launch — Where Vibe Coders Get Discovered', description: 'Discover and launch new AI and tech products built by ambitious makers.' },
  '/products': { title: 'Discover New AI Products | Launch', description: 'Explore recently launched AI tools, SaaS products, and projects from independent makers.' },
  '/vibecoders': { title: 'Top Vibe Coders | Launch', description: 'Live leaderboard of the top vibe coders on Launch. Track trending builders, biggest risers, and weekly rank movement.' },
  '/tech': { title: 'Products by Technology | Launch', description: 'Discover launched products by the technologies and AI builders used to make them.' },
  '/categories': { title: 'All Categories & Tags | Launch', description: 'Browse Launch products across the complete taxonomy of indie maker tools.' },
  '/tags': { title: 'Popular Tags | Launch', description: 'Browse popular product tags and discover products by topic, technology, and category.' },
  '/awards': { title: 'Launch Awards | Launch', description: 'Explore standout products and makers recognised by the Launch community.' },
  '/success-stories': { title: 'Launch Success Stories | Launch', description: 'See products and makers building momentum after launching on Launch.' },
  '/collections': { title: 'Collections — Curated Launches | Launch', description: 'Explore curated collections of the best launches from the Launch community.' },
  '/launches/today': { title: "Today's Launches | Launch", description: 'Discover the latest products launching today on Launch.' },
  '/blog': { title: 'Launch Blog', description: 'Practical launch advice, founder stories, and product discovery insights.' },
};

const ROUTED_STATIC_PATHS = new Set([
  '/about', '/ai-info', '/faq', '/contact', '/advertise', '/advertising', '/terms', '/privacy',
  '/pricing', '/pass', '/product-hunt-alternative', '/product-launch-platform', '/product-launch-strategy',
  '/media-kit', '/vibe-coding', '/tools', '/compare', '/reserve', '/start', '/submit', '/auth',
  '/newsletter', '/notifications', '/search', '/discourse-sso', '/api/discourse-sso',
]);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const cleanText = (value: string | null | undefined, fallback: string) =>
  (value || fallback).replace(/\s+/g, ' ').trim().slice(0, 300);

const page = ({ title, description, canonicalPath, image = DEFAULT_IMAGE, type = 'website', noindex = false }: {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  type?: string;
  noindex?: boolean;
}) => {
  const canonical = `${SITE}${canonicalPath}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonical);
  const safeImage = escapeHtml(image);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><meta name="description" content="${safeDescription}">${noindex ? '<meta name="robots" content="noindex,follow">' : ''}<link rel="canonical" href="${safeCanonical}"><meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}"><meta property="og:url" content="${safeCanonical}"><meta property="og:type" content="${type}"><meta property="og:site_name" content="Launch"><meta property="og:image" content="${safeImage}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${safeTitle}"><meta name="twitter:description" content="${safeDescription}"><meta name="twitter:image" content="${safeImage}"></head><body><main><h1>${safeTitle}</h1><p>${safeDescription}</p><p><a href="${safeCanonical}">View this page on Launch</a></p></main></body></html>`;
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'page';
  const requestedPath = url.searchParams.get('path') || '/';
  if (!requestedPath.startsWith('/') || requestedPath.startsWith('//')) return json({ error: 'Invalid path' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  );

  try {
    const productMatch = requestedPath.match(/^\/launch\/([^/]+)$/);
    if (productMatch) {
      const slug = decodeURIComponent(productMatch[1]);
      const { data: current } = await supabase
        .from('products')
        .select('id, slug, name, tagline, description, status')
        .eq('slug', slug)
        .maybeSingle();

      if (mode === 'resolve') {
        if (current) return json({ state: 'current', canonicalPath: `/launch/${current.slug}` });
        const { data: history } = await supabase
          .from('product_slug_history')
          .select('product_id')
          .eq('old_slug', slug)
          .maybeSingle();
        if (!history) return json({ state: 'missing' }, 404);
        const { data: destination } = await supabase
          .from('products')
          .select('slug')
          .eq('id', history.product_id)
          .maybeSingle();
        return destination?.slug
          ? json({ state: 'redirect', canonicalPath: `/launch/${destination.slug}` })
          : json({ state: 'missing' }, 404);
      }

      if (!current) return new Response('Not found', { status: 404 });
      const { data: media } = await supabase
        .from('product_media')
        .select('url, type')
        .eq('product_id', current.id)
        .in('type', ['screenshot', 'thumbnail'])
        .limit(1)
        .maybeSingle();
      const title = `${cleanText(current.name, 'Product')} | Launch`;
      const description = cleanText(current.tagline || current.description, 'Discover this product on Launch.');
      return new Response(page({
        title,
        description,
        canonicalPath: `/launch/${current.slug}`,
        image: media?.url || DEFAULT_IMAGE,
        type: 'product',
      }), { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (mode === 'resolve') {
      if (INDEXABLE_STATIC_PAGES[requestedPath] || ROUTED_STATIC_PATHS.has(requestedPath)
        || /^\/(?:best|vs|alternatives)\/[a-z0-9-]+$/.test(requestedPath)
        || /^\/vibe-coding\/[a-z0-9-]+$/.test(requestedPath)
        || /^\/tools\/[a-z0-9-]+$/.test(requestedPath)
        || /^\/compare\/[a-z0-9-]+$/.test(requestedPath)
        || /^\/launches\/(?:today|\d{4}|\d{4}-\d{2}-\d{2}|\d{4}\/(?:w|m)\d{2})$/.test(requestedPath)) {
        return json({ state: 'current', canonicalPath: requestedPath });
      }

      const category = requestedPath.match(/^\/category\/([^/]+)$/);
      if (category) {
        const { data } = await supabase.from('product_categories').select('name');
        return data?.some((item: { name: string }) => slugify(item.name) === decodeURIComponent(category[1]))
          ? json({ state: 'current', canonicalPath: requestedPath })
          : json({ state: 'missing' }, 404);
      }

      const tag = requestedPath.match(/^\/tag\/([^/]+)$/);
      if (tag) {
        const { data } = await supabase.from('product_tags').select('id').eq('slug', decodeURIComponent(tag[1])).maybeSingle();
        return data ? json({ state: 'current', canonicalPath: requestedPath }) : json({ state: 'missing' }, 404);
      }

      const collection = requestedPath.match(/^\/collections\/([^/]+)$/);
      if (collection) {
        const { data } = await supabase.from('user_collections').select('id').eq('slug', decodeURIComponent(collection[1])).eq('is_public', true).maybeSingle();
        return data ? json({ state: 'current', canonicalPath: requestedPath }) : json({ state: 'missing' }, 404);
      }

      const blog = requestedPath.match(/^\/blog\/([^/]+)$/);
      if (blog) {
        const { data } = await supabase.from('blog_posts').select('id').eq('slug', decodeURIComponent(blog[1])).eq('status', 'published').maybeSingle();
        return data ? json({ state: 'current', canonicalPath: requestedPath }) : json({ state: 'missing' }, 404);
      }

      const profile = requestedPath.match(/^\/@([a-zA-Z0-9_-]+)$/);
      if (profile) {
        const { data } = await supabase.from('users').select('id').eq('username', profile[1]).maybeSingle();
        return data ? json({ state: 'current', canonicalPath: requestedPath }) : json({ state: 'missing' }, 404);
      }

      return json({ state: 'missing' }, 404);
    }

    const categoryMatch = requestedPath.match(/^\/category\/([^/]+)$/);
    if (categoryMatch) {
      const slug = decodeURIComponent(categoryMatch[1]);
      const { data: categories } = await supabase.from('product_categories').select('id, name');
      const category = categories?.find((item: { name: string }) => slugify(item.name) === slug);
      if (!category) return new Response('Not found', { status: 404 });
      const { count } = await supabase
        .from('product_category_map')
        .select('product_id, products!inner(status)', { count: 'exact', head: true })
        .eq('category_id', category.id)
        .eq('products.status', 'launched');
      const name = category.name;
      return new Response(page({
        title: `${name} AI Apps | Launch`,
        description: `Discover ${count || 0} launched ${name.toLowerCase()} products on Launch.`,
        canonicalPath: `/category/${slug}`,
        noindex: (count || 0) < MIN_INDEXABLE_CATEGORY_PRODUCTS,
      }), { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const tagMatch = requestedPath.match(/^\/tag\/([^/]+)$/);
    if (tagMatch) {
      const slug = decodeURIComponent(tagMatch[1]);
      const { data: tag } = await supabase.from('product_tags').select('id, name, description').eq('slug', slug).maybeSingle();
      if (!tag) return new Response('Not found', { status: 404 });
      const { count } = await supabase
        .from('product_tag_map')
        .select('product_id, products!inner(status)', { count: 'exact', head: true })
        .eq('tag_id', tag.id)
        .eq('products.status', 'launched');
      const productCount = count || 0;
      return new Response(page({
        title: `${tag.name} AI Apps | Launch`,
        description: cleanText(tag.description, `Discover ${productCount} launched products tagged ${tag.name} on Launch.`),
        canonicalPath: `/tag/${slug}`,
        noindex: productCount < MIN_INDEXABLE_TAG_PRODUCTS,
      }), { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const techMatch = requestedPath.match(/^\/tech\/([^/]+)$/);
    if (techMatch) {
      const slug = decodeURIComponent(techMatch[1]);
      const { data: stack } = await supabase.from('stack_items').select('id, name').eq('slug', slug).maybeSingle();
      if (!stack) return new Response('Not found', { status: 404 });
      const { count } = await supabase
        .from('product_stack_map')
        .select('product_id, products!inner(status)', { count: 'exact', head: true })
        .eq('stack_item_id', stack.id)
        .eq('products.status', 'launched');
      const productCount = count || 0;
      return new Response(page({
        title: `Apps Built with ${stack.name} (${productCount}) | Launch`,
        description: `Explore ${productCount} launched products built with ${stack.name}.`,
        canonicalPath: `/tech/${slug}`,
        noindex: productCount < MIN_INDEXABLE_TAG_PRODUCTS,
      }), { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const collectionMatch = requestedPath.match(/^\/collections\/([^/]+)$/);
    if (collectionMatch) {
      const slug = decodeURIComponent(collectionMatch[1]);
      const { data: collection } = await supabase
        .from('user_collections')
        .select('id, name, description, is_public')
        .eq('slug', slug)
        .eq('is_public', true)
        .maybeSingle();
      if (!collection) return new Response('Not found', { status: 404 });
      const { count } = await supabase
        .from('user_collection_items')
        .select('product_id, products!inner(status)', { count: 'exact', head: true })
        .eq('collection_id', collection.id)
        .eq('products.status', 'launched');
      return new Response(page({
        title: `${cleanText(collection.name, 'Launch Collection')} | Launch Collection`,
        description: cleanText(collection.description, 'A public collection of launches on Launch.'),
        canonicalPath: `/collections/${slug}`,
        noindex: (count || 0) < MIN_INDEXABLE_COLLECTION_PRODUCTS || !collection.description?.trim(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const staticPage = INDEXABLE_STATIC_PAGES[requestedPath];
    if (staticPage) {
      return new Response(page({ ...staticPage, canonicalPath: requestedPath }), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (/^\/launches\/(?:\d{4}|\d{4}-\d{2}-\d{2}|\d{4}\/(?:w|m)\d{2})$/.test(requestedPath)) {
      return new Response(page({
        title: 'Launch Archive | Launch',
        description: 'Browse historical product launches on Launch.',
        canonicalPath: requestedPath,
      }), { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return new Response('Not found', { status: 404 });
  } catch (error) {
    console.error('SEO page error', error);
    return new Response('SEO metadata unavailable', { status: 500 });
  }
});
