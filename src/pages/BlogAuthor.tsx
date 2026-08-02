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
import { AUTHOR_BY_SLUG } from '@/lib/blog/authors';
import { authorOf, categoryOf, readTime, type BlogPostRecord } from '@/lib/blog/post';

const BlogAuthorPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const author = slug ? AUTHOR_BY_SLUG[slug] : undefined;
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
    () => (author ? posts.filter((p) => authorOf(p).slug === author.slug) : []),
    [posts, author],
  );

  const stats = useMemo(() => {
    const views = items.reduce((s, p) => s + (p.view_count || 0), 0);
    const minutes = items.reduce((s, p) => s + readTime(p), 0);
    const cats = new Set(items.map((p) => categoryOf(p).name));
    return { articles: items.length, views, minutes, categories: cats.size };
  }, [items]);

  if (!author) return <NotFound />;

  const url = `https://trylaunch.ai/blog/author/${author.slug}`;
  const title = `${author.name} — ${author.role} at ${author.company} | Launch Blog`;
  const description = author.bio.slice(0, 155);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-20 md:py-28">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            mainEntity: {
              '@type': 'Person',
              name: author.name,
              jobTitle: author.role,
              description: author.bio,
              url,
              knowsAbout: author.expertise,
              worksFor: { '@type': 'Organization', name: 'Launch', url: 'https://trylaunch.ai' },
              sameAs: author.socials.map((s) => s.url),
            },
          })}
        </script>
      </Helmet>

      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://trylaunch.ai' },
          { name: 'Blog', url: 'https://trylaunch.ai/blog' },
          { name: author.name, url },
        ]}
      />

      <header className="max-w-3xl mb-14">
        <Link
          to="/blog"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          ← All articles
        </Link>
        <div className="flex items-start gap-6 mt-6">
          <div
            className="h-20 w-20 shrink-0 rounded-full bg-muted flex items-center justify-center font-reckless text-2xl"
            aria-hidden
          >
            {author.avatar ? (
              <img
                src={author.avatar}
                alt={author.name}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              author.name.charAt(0)
            )}
          </div>
          <div>
            <h1 className="font-reckless text-4xl md:text-5xl tracking-tight mb-2">{author.name}</h1>
            <p className="text-muted-foreground">
              {author.role} · {author.company}
            </p>
          </div>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed mt-6">{author.bio}</p>

        <div className="flex flex-wrap gap-2 mt-6">
          {author.expertise.map((e) => (
            <Badge key={e} variant="secondary" className="text-xs font-normal">
              {e}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mt-6 text-sm">
          {author.socials.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer me"
              className="text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              {s.label}
            </a>
          ))}
        </div>
      </header>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 border-y border-border/60 py-8">
        {[
          { label: 'Articles published', value: stats.articles.toLocaleString() },
          { label: 'Total reads', value: stats.views.toLocaleString() },
          { label: 'Topics covered', value: stats.categories.toLocaleString() },
          { label: 'Minutes of reading', value: stats.minutes.toLocaleString() },
        ].map((s) => (
          <div key={s.label}>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{s.label}</dt>
            <dd className="font-reckless text-3xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="font-reckless text-2xl md:text-3xl mb-8">Articles by {author.name}</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-14">
          {items.map((p) => (
            <BlogCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <BlogCTA variant="launch" />
    </div>
  );
};

export default BlogAuthorPage;
