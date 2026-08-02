import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BreadcrumbSchema } from '@/components/JsonLd';
import BlogCard from '@/components/blog/BlogCard';
import BlogCTA from '@/components/blog/BlogCTA';
import NotFound from '@/pages/NotFound';
import { CATEGORY_BY_SLUG, CATEGORIES } from '@/lib/blog/taxonomy';
import { categoryOf, trendingScore, type BlogPostRecord } from '@/lib/blog/post';

const BlogCategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const category = slug ? CATEGORY_BY_SLUG[slug] : undefined;
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('blog_posts')
        .select('id, slug, title, excerpt, content_md, cover_image_url, card_image_url, og_image_url, tags, view_count, published_at, updated_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(200);
      setPosts((data as BlogPostRecord[]) || []);
      setLoading(false);
    };
    run();
  }, [slug]);

  const items = useMemo(
    () => (category ? posts.filter((p) => categoryOf(p).slug === category.slug) : []),
    [posts, category],
  );
  const popular = useMemo(
    () => [...items].sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, 4),
    [items],
  );

  if (!category) return <NotFound />;

  const url = `https://trylaunch.ai/blog/category/${category.slug}`;
  const title = `${category.name} — Startup Guides & Playbooks | Launch Blog`;
  const description = category.intro.slice(0, 155);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-20 md:py-28">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: category.name,
            url,
            description: category.intro,
            isPartOf: { '@type': 'Blog', name: 'The Launch Blog', url: 'https://trylaunch.ai/blog' },
          })}
        </script>
        {category.faqs.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: category.faqs.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: { '@type': 'Answer', text: f.answer },
              })),
            })}
          </script>
        )}
      </Helmet>

      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://trylaunch.ai' },
          { name: 'Blog', url: 'https://trylaunch.ai/blog' },
          { name: category.name, url },
        ]}
      />

      <header className="max-w-3xl mb-14">
        <Link
          to="/blog"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          ← All articles
        </Link>
        <h1 className="font-reckless text-4xl md:text-6xl leading-[1.05] tracking-tight mt-6 mb-5">
          {category.name}
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">{category.intro}</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">New {category.name.toLowerCase()} articles arriving soon.</p>
      ) : (
        <>
          <section className="mb-20">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6">
              Featured
            </p>
            <BlogCard post={items[0]} variant="featured" />
          </section>

          {popular.length > 1 && (
            <section className="mb-20 border-t border-border/60 pt-14">
              <h2 className="font-reckless text-2xl md:text-3xl mb-8">Most popular in {category.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-12">
                {popular.map((p) => (
                  <BlogCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}

          <section className="mb-20 border-t border-border/60 pt-14">
            <h2 className="font-reckless text-2xl md:text-3xl mb-8">All {category.name} articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-14">
              {items.slice(1).map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="border-t border-border/60 pt-14 mb-16">
        <h2 className="font-reckless text-2xl md:text-3xl mb-8">Frequently asked questions</h2>
        <div className="space-y-8 max-w-3xl">
          {category.faqs.map((f) => (
            <div key={f.question}>
              <h3 className="text-lg font-medium mb-2">{f.question}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 pt-14 mb-4">
        <h2 className="font-reckless text-xl mb-5">Related categories</h2>
        <div className="flex flex-wrap gap-2">
          {category.related.map((r) => {
            const rel = CATEGORY_BY_SLUG[r] ?? CATEGORIES[0];
            return (
              <Link key={r} to={`/blog/category/${rel.slug}`}>
                <Badge variant="secondary" className="text-xs font-normal">
                  {rel.name}
                </Badge>
              </Link>
            );
          })}
        </div>
      </section>

      <BlogCTA variant="newsletter" />
    </div>
  );
};

export default BlogCategoryPage;
