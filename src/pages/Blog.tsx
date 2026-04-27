import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BreadcrumbSchema } from '@/components/JsonLd';
import { format } from 'date-fns';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  published_at: string | null;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag');

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await (supabase as any)
        .from('blog_posts')
        .select('id, slug, title, excerpt, cover_image_url, tags, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);
      setPosts((data as BlogPost[]) || []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags?.some((t) => t.toLowerCase() === activeTag.toLowerCase()));
  }, [posts, activeTag]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-20 md:py-28">
      <Helmet>
        <title>Blog — Launch Strategy, Indie Hacker Tactics & AI Tools | Launch</title>
        <meta
          name="description"
          content="Insights, strategies, and playbooks for founders launching products. Weekly articles on indie hacking, AI tools, and product launch tactics."
        />
        <link rel="canonical" href="https://trylaunch.ai/blog" />
        <meta property="og:title" content="Blog — Launch" />
        <meta property="og:description" content="Insights and strategies for founders launching products." />
        <meta property="og:url" content="https://trylaunch.ai/blog" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://trylaunch.ai' },
          { name: 'Blog', url: 'https://trylaunch.ai/blog' },
        ]}
      />

      <header className="mb-16 md:mb-24 max-w-3xl">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-4">
          The Launch Blog
        </p>
        <h1 className="font-reckless text-5xl md:text-7xl leading-[1.05] tracking-tight mb-6">
          Playbooks for founders shipping in public.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          Tactics, case studies, and field notes on launching, distribution,
          and building durable products.
        </p>
      </header>

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
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>{activeTag ? `No articles tagged "${activeTag}".` : 'New articles arriving soon.'}</p>
        </div>
      ) : (
        <>
          {/* Featured (first) post */}
          {filteredPosts[0] && (
            <Link
              to={`/blog/${filteredPosts[0].slug}`}
              className="group block mb-20 md:mb-28"
            >
              <article className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
                {filteredPosts[0].cover_image_url && (
                  <div className="md:col-span-7 aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={filteredPosts[0].cover_image_url}
                      alt={filteredPosts[0].title}
                      loading="eager"
                      width={1200}
                      height={750}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                )}
                <div className={filteredPosts[0].cover_image_url ? 'md:col-span-5' : 'md:col-span-12'}>
                  {filteredPosts[0].tags && filteredPosts[0].tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {filteredPosts[0].tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <h2 className="font-reckless text-3xl md:text-5xl leading-[1.1] tracking-tight mb-5 group-hover:text-primary transition-colors">
                    {filteredPosts[0].title}
                  </h2>
                  {filteredPosts[0].excerpt && (
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-5 line-clamp-3">
                      {filteredPosts[0].excerpt}
                    </p>
                  )}
                  {filteredPosts[0].published_at && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(filteredPosts[0].published_at), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          )}

          {/* Section divider */}
          {filteredPosts.length > 1 && (
            <div className="border-t border-border/60 pt-16 md:pt-20 mb-12">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                More articles
              </p>
            </div>
          )}

          {/* Rest of posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16 md:gap-y-20">
            {filteredPosts.slice(1).map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                <article>
                  {post.cover_image_url && (
                    <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted mb-6">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        loading="lazy"
                        width={800}
                        height={500}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    </div>
                  )}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <h3 className="font-reckless text-2xl md:text-3xl leading-[1.15] tracking-tight mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-base text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                  )}
                  {post.published_at && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(post.published_at), 'MMMM d, yyyy')}
                    </p>
                  )}
                </article>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Blog;
