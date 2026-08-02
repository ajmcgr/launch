import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BreadcrumbSchema } from '@/components/JsonLd';
import BlogCard from '@/components/blog/BlogCard';
import BlogCTA from '@/components/blog/BlogCTA';
import { CATEGORIES } from '@/lib/blog/taxonomy';
import { categoryOf, trendingScore, type BlogPostRecord } from '@/lib/blog/post';

const SectionHeader = ({
  eyebrow,
  title,
  href,
  description,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  description?: string;
}) => (
  <div className="flex items-end justify-between gap-6 mb-8">
    <div>
      {eyebrow && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{eyebrow}</p>
      )}
      <h2 className="font-reckless text-2xl md:text-3xl tracking-tight">{title}</h2>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-xl">{description}</p>}
    </div>
    {href && (
      <Link
        to={href}
        className="shrink-0 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
      >
        View all
      </Link>
    )}
  </div>
);

const Blog = () => {
  const [posts, setPosts] = useState<BlogPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag');

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await (supabase as any)
        .from('blog_posts')
        .select('id, slug, title, excerpt, content_md, cover_image_url, card_image_url, og_image_url, tags, view_count, published_at, updated_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(60);
      setPosts((data as BlogPostRecord[]) || []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const tagFiltered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags?.some((t) => t.toLowerCase() === activeTag.toLowerCase()));
  }, [posts, activeTag]);

  const featured = tagFiltered[0];
  const trending = useMemo(
    () => [...tagFiltered].sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, 4),
    [tagFiltered],
  );
  const mostPopular = useMemo(
    () => [...tagFiltered].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5),
    [tagFiltered],
  );
  const latest = tagFiltered.slice(1, 7);

  const byCategory = useMemo(() => {
    const map = new Map<string, BlogPostRecord[]>();
    for (const p of tagFiltered) {
      const slug = categoryOf(p).slug;
      map.set(slug, [...(map.get(slug) || []), p]);
    }
    return map;
  }, [tagFiltered]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-20 md:py-28">
      <Helmet>
        <title>Launch Blog — Startup Launch, Distribution & Growth Playbooks</title>
        <meta
          name="description"
          content="The publication for founders launching products: Product Hunt playbooks, startup directories, distribution channels, startup SEO, pricing and founder case studies."
        />
        <link rel="canonical" href="https://trylaunch.ai/blog" />
        <meta property="og:title" content="Launch Blog — Startup Launch & Distribution Playbooks" />
        <meta
          property="og:description"
          content="Playbooks, case studies and field notes for founders launching products."
        />
        <meta property="og:url" content="https://trylaunch.ai/blog" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'The Launch Blog',
            url: 'https://trylaunch.ai/blog',
            description:
              'Startup launch, distribution, marketing and founder growth playbooks from Launch.',
            publisher: {
              '@type': 'Organization',
              name: 'Launch',
              url: 'https://trylaunch.ai',
            },
          })}
        </script>
      </Helmet>

      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://trylaunch.ai' },
          { name: 'Blog', url: 'https://trylaunch.ai/blog' },
        ]}
      />

      <header className="mb-14 md:mb-20 max-w-3xl">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">
          The Launch Blog
        </p>
        <h1 className="font-reckless text-5xl md:text-7xl leading-[1.05] tracking-tight mb-6">
          Playbooks for founders shipping in public.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          Launch strategy, distribution, marketing and founder case studies — published every day,
          built on data from thousands of product launches.
        </p>
      </header>

      {/* Hub navigation */}
      <nav aria-label="Blog categories" className="mb-14 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link key={c.slug} to={`/blog/category/${c.slug}`}>
            <Badge variant="secondary" className="text-xs font-normal hover:bg-secondary/70">
              {c.name}
            </Badge>
          </Link>
        ))}
      </nav>

      {activeTag && (
        <div className="mb-10 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtered by tag:</span>
          <Badge variant="default" className="text-sm">{activeTag}</Badge>
          <button
            onClick={() => setSearchParams({})}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Clear filter
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-16">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : tagFiltered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>{activeTag ? `No articles tagged "${activeTag}".` : 'New articles arriving soon.'}</p>
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured && (
            <section className="mb-20 md:mb-28">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-6">
                Featured article
              </p>
              <BlogCard post={featured} variant="featured" />
            </section>
          )}

          {/* Trending + Most popular */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 mb-20 md:mb-24">
            <section className="lg:col-span-2">
              <SectionHeader eyebrow="Right now" title="Trending" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
                {trending.map((p) => (
                  <BlogCard key={p.id} post={p} />
                ))}
              </div>
            </section>
            <aside>
              <SectionHeader eyebrow="All time" title="Most popular" />
              <div className="space-y-6">
                {mostPopular.map((p) => (
                  <BlogCard key={p.id} post={p} variant="compact" />
                ))}
              </div>
              <div className="mt-10">
                <BlogCTA variant="newsletter" compact />
              </div>
            </aside>
          </div>

          {/* Latest */}
          <section className="mb-20 md:mb-24 border-t border-border/60 pt-14">
            <SectionHeader eyebrow="Published daily" title="Latest" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-14">
              {latest.map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </section>

          {/* Category sections — auto-populated as new posts publish */}
          {CATEGORIES.map((cat) => {
            const items = (byCategory.get(cat.slug) || []).slice(0, 3);
            if (items.length === 0) return null;
            return (
              <section key={cat.slug} className="mb-20 md:mb-24 border-t border-border/60 pt-14">
                <SectionHeader
                  eyebrow={cat.tagline}
                  title={cat.name}
                  href={`/blog/category/${cat.slug}`}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-14">
                  {items.map((p) => (
                    <BlogCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            );
          })}

          <BlogCTA variant="launch" />
        </>
      )}
    </div>
  );
};

export default Blog;
