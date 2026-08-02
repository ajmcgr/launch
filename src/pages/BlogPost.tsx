import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BreadcrumbSchema } from '@/components/JsonLd';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import BlogCTA from '@/components/blog/BlogCTA';
import BlogCard from '@/components/blog/BlogCard';
import { ReadingProgress, TableOfContents, ShareBar } from '@/components/blog/ArticleChrome';
import {
  authorOf,
  categoryOf,
  extractFaqs,
  extractHeadings,
  extractKeyTakeaways,
  extractTldr,
  heroImage,
  ogImage,
  isUpdated,
  readTime,
  relatedPosts,
  slugifyHeading,
  type BlogPostRecord,
} from '@/lib/blog/post';

const LIST_FIELDS =
  'id, slug, title, excerpt, content_md, cover_image_url, card_image_url, og_image_url, tags, view_count, published_at, updated_at';

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<BlogPostRecord[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const [{ data }, { data: rest }] = await Promise.all([
        (supabase as any)
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .maybeSingle(),
        (supabase as any)
          .from('blog_posts')
          .select(LIST_FIELDS)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(120),
      ]);
      setPost((data as BlogPostRecord) || null);
      setAll((rest as BlogPostRecord[]) || []);
      setLoading(false);
      window.scrollTo({ top: 0 });
    };
    if (slug) run();
  }, [slug]);

  const headings = useMemo(() => extractHeadings(post?.content_md || ''), [post]);
  const faqs = useMemo(() => extractFaqs(post?.content_md || ''), [post]);
  const takeaways = useMemo(() => extractKeyTakeaways(post?.content_md || ''), [post]);
  const related = useMemo(() => (post ? relatedPosts(post, all, 3) : []), [post, all]);

  const { prev, next } = useMemo(() => {
    if (!post) return { prev: null as BlogPostRecord | null, next: null as BlogPostRecord | null };
    const idx = all.findIndex((p) => p.id === post.id);
    return {
      next: idx > 0 ? all[idx - 1] : null, // newer
      prev: idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null, // older
    };
  }, [post, all]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-12 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-reckless text-3xl mb-4">Article not found</h1>
        <Button onClick={() => navigate('/blog')}>Back to Blog</Button>
      </div>
    );
  }

  const url = `https://trylaunch.ai/blog/${post.slug}`;
  const category = categoryOf(post);
  const author = authorOf(post);
  const minutes = readTime(post);
  const updated = isUpdated(post);
  const tldr = extractTldr(post);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: ogImage(post),
    datePublished: post.published_at,
    dateModified: post.updated_at,
    articleSection: category.name,
    wordCount: (post.content_md || '').split(/\s+/).length,
    author: {
      '@type': 'Person',
      name: author.name,
      jobTitle: author.role,
      url: `https://trylaunch.ai/blog/author/${author.slug}`,
      knowsAbout: author.expertise,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Launch',
      logo: { '@type': 'ImageObject', url: 'https://trylaunch.ai/images/launch-logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.tags?.join(', '),
  };

  const faqSchema = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null;

  return (
    <>
      <ReadingProgress />
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <Helmet>
          <title>{post.meta_title || post.title} | Launch</title>
          <meta name="description" content={post.meta_description || post.excerpt || ''} />
          <link rel="canonical" href={url} />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={post.title} />
          <meta property="og:description" content={post.meta_description || post.excerpt || ''} />
          <meta property="og:url" content={url} />
          <meta property="og:image" content={ogImage(post)} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          {post.published_at && (
            <meta property="article:published_time" content={post.published_at} />
          )}
          {post.updated_at && <meta property="article:modified_time" content={post.updated_at} />}
          <meta property="article:section" content={category.name} />
          <meta name="author" content={author.name} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={post.title} />
          <meta name="twitter:description" content={post.meta_description || post.excerpt || ''} />
          <meta name="twitter:image" content={ogImage(post)} />
          <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
          {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
        </Helmet>

        <BreadcrumbSchema
          items={[
            { name: 'Home', url: 'https://trylaunch.ai' },
            { name: 'Blog', url: 'https://trylaunch.ai/blog' },
            { name: category.name, url: `https://trylaunch.ai/blog/category/${category.slug}` },
            { name: post.title, url },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 lg:col-start-1 max-w-3xl">
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>

            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Link to={`/blog/category/${category.slug}`}>
                  <Badge variant="secondary" className="text-xs">{category.name}</Badge>
                </Link>
                {updated && <Badge variant="outline" className="text-xs">Updated</Badge>}
                {post.tags?.slice(0, 3).map((t) => (
                  <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`}>
                    <Badge variant="secondary" className="text-xs cursor-pointer">{t}</Badge>
                  </Link>
                ))}
              </div>

              <h1 className="font-reckless text-4xl md:text-5xl leading-[1.1] tracking-tight mb-5">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <Link
                  to={`/blog/author/${author.slug}`}
                  className="text-foreground hover:text-primary transition-colors"
                >
                  {author.name}
                </Link>
                <span aria-hidden>·</span>
                {post.published_at && (
                  <time dateTime={post.published_at}>
                    {format(new Date(post.published_at), 'MMMM d, yyyy')}
                  </time>
                )}
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> {minutes} min read
                </span>
              </div>
              {post.updated_at && updated && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated {format(new Date(post.updated_at), 'MMMM d, yyyy')} · Reviewed by the
                  Launch editorial team
                </p>
              )}
            </header>

            {(post.cover_image_url || post.card_image_url) && (
              <img
                src={heroImage(post)}
                alt={post.title}
                width={1200}
                height={675}
                loading="eager"
                fetchPriority="high"
                className="w-full aspect-[16/9] object-cover rounded-xl mb-10"
              />
            )}

            {tldr && (
              <aside className="mb-10 rounded-xl border border-border bg-muted/30 p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  TL;DR
                </p>
                <p className="text-base leading-relaxed">{tldr}</p>
              </aside>
            )}

            {takeaways.length > 0 && (
              <aside className="mb-10 rounded-xl border border-border p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  Key takeaways
                </p>
                <ul className="space-y-2 text-[15px] leading-relaxed list-disc pl-5">
                  {takeaways.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </aside>
            )}

            {/* Mobile TOC */}
            {headings.length >= 3 && (
              <details className="lg:hidden mb-10 rounded-xl border border-border p-5">
                <summary className="cursor-pointer text-sm font-medium">Table of contents</summary>
                <div className="mt-4">
                  <TableOfContents headings={headings} />
                </div>
              </details>
            )}

            <article className="prose prose-neutral dark:prose-invert max-w-none prose-lg prose-headings:font-reckless prose-headings:tracking-tight prose-h2:text-3xl prose-h2:mt-14 prose-h3:text-xl prose-p:leading-[1.75] prose-li:leading-[1.75] prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-table:text-[15px] prose-th:text-left prose-pre:rounded-xl prose-pre:border prose-pre:border-border">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children, ...props }) => (
                    <h2 id={slugifyHeading(String(children))} {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 id={slugifyHeading(String(children))} {...props}>
                      {children}
                    </h3>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table>{children}</table>
                    </div>
                  ),
                  a: ({ href, children }) => {
                    const internal = href?.startsWith('https://trylaunch.ai/');
                    if (internal) {
                      return <Link to={href!.replace('https://trylaunch.ai', '')}>{children}</Link>;
                    }
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {post.content_md || ''}
              </ReactMarkdown>
            </article>

            <div className="mt-10 flex flex-col gap-6 border-t pt-8">
              <ShareBar url={url} title={post.title} />
            </div>

            {/* Author box — E-E-A-T */}
            <section className="mt-10 rounded-xl border border-border p-6 flex gap-5 items-start">
              <div className="h-14 w-14 shrink-0 rounded-full bg-muted flex items-center justify-center font-reckless text-xl">
                {author.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium">
                  <Link to={`/blog/author/${author.slug}`} className="hover:text-primary">
                    {author.name}
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  {author.role} · {author.company}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{author.bio}</p>
              </div>
            </section>

            <BlogCTA variant="submit" compact />

            {/* Prev / next */}
            {(prev || next) && (
              <nav
                aria-label="More articles"
                className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-8"
              >
                {prev && (
                  <Link
                    to={`/blog/${prev.slug}`}
                    className="group rounded-xl border border-border p-5 hover:bg-muted/40 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1">
                      <ArrowLeft className="h-3 w-3" /> Previous article
                    </p>
                    <p className="font-reckless text-lg leading-snug group-hover:text-primary">
                      {prev.title}
                    </p>
                  </Link>
                )}
                {next && (
                  <Link
                    to={`/blog/${next.slug}`}
                    className="group rounded-xl border border-border p-5 hover:bg-muted/40 transition-colors sm:text-right"
                  >
                    <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1">
                      Next article <ArrowRight className="h-3 w-3" />
                    </p>
                    <p className="font-reckless text-lg leading-snug group-hover:text-primary">
                      {next.title}
                    </p>
                  </Link>
                )}
              </nav>
            )}

            {related.length > 0 && (
              <section className="mt-16 pt-10 border-t">
                <h2 className="font-reckless text-2xl mb-8">Related reading</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-10">
                  {related.map((r) => (
                    <BlogCard key={r.id} post={r} variant="compact" />
                  ))}
                </div>
              </section>
            )}

            <BlogCTA variant="launch" />
          </div>

          {/* Sticky sidebar */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-10">
              <TableOfContents headings={headings} />
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  Explore
                </p>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to={`/blog/category/${category.slug}`} className="hover:text-primary">
                      More {category.name.toLowerCase()} guides
                    </Link>
                  </li>
                  <li>
                    <Link to="/launches/today" className="hover:text-primary">
                      Today&apos;s launches
                    </Link>
                  </li>
                  <li>
                    <Link to="/products" className="hover:text-primary">
                      Browse all products
                    </Link>
                  </li>
                  <li>
                    <Link to="/submit" className="hover:text-primary">
                      Submit your product
                    </Link>
                  </li>
                </ul>
              </div>
              <BlogCTA variant="newsletter" compact />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default BlogPostPage;
