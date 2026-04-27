import { useEffect, useState } from 'react';
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
import { ArrowLeft } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string;
  cover_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[] | null;
  published_at: string | null;
  updated_at: string;
}

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<{ slug: string; title: string }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }
      const typed = data as BlogPost;
      setPost(typed);

      const { data: rel } = await (supabase as any)
        .from('blog_posts')
        .select('slug, title')
        .eq('status', 'published')
        .neq('id', typed.id)
        .order('published_at', { ascending: false })
        .limit(3);
      setRelated((rel as { slug: string; title: string }[]) || []);
      setLoading(false);
    };
    if (slug) fetch();
  }, [slug]);

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
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.cover_image_url || 'https://trylaunch.ai/social-card.png',
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Organization',
      name: 'Launch',
      url: 'https://trylaunch.ai',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Launch',
      logo: {
        '@type': 'ImageObject',
        url: 'https://trylaunch.ai/images/launch-logo.png',
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: post.tags?.join(', '),
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Helmet>
        <title>{post.meta_title || post.title} | Launch</title>
        <meta name="description" content={post.meta_description || post.excerpt || ''} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt || ''} />
        <meta property="og:url" content={url} />
        {post.cover_image_url && <meta property="og:image" content={post.cover_image_url} />}
        {post.published_at && <meta property="article:published_time" content={post.published_at} />}
        <meta property="article:modified_time" content={post.updated_at} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.meta_description || post.excerpt || ''} />
        {post.cover_image_url && <meta name="twitter:image" content={post.cover_image_url} />}
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://trylaunch.ai' },
          { name: 'Blog', url: 'https://trylaunch.ai/blog' },
          { name: post.title, url },
        ]}
      />

      <Link
        to="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </Link>

      <header className="mb-8">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.map((t) => (
              <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`}>
                <Badge variant="secondary" className="text-xs cursor-pointer">
                  {t}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        <h1 className="font-reckless text-4xl md:text-5xl leading-tight mb-4">{post.title}</h1>
        {post.published_at && (
          <p className="text-sm text-muted-foreground">
            Published {format(new Date(post.published_at), 'MMMM d, yyyy')}
          </p>
        )}
      </header>

      {post.cover_image_url && (
        <img
          src={post.cover_image_url}
          alt={post.title}
          width={1200}
          height={675}
          className="w-full aspect-[16/9] object-cover rounded-xl mb-10"
        />
      )}

      <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-reckless prose-h2:text-2xl prose-h3:text-xl prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content_md}</ReactMarkdown>
      </article>

      {related.length > 0 && (
        <section className="mt-16 pt-10 border-t">
          <h2 className="font-reckless text-2xl mb-6">More from the blog</h2>
          <ul className="space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to={`/blog/${r.slug}`}
                  className="text-base hover:text-primary transition-colors"
                >
                  → {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 p-8 rounded-xl bg-muted/40 text-center">
        <h2 className="font-reckless text-2xl mb-3">Ready to launch your product?</h2>
        <p className="text-muted-foreground mb-5">
          Join thousands of founders shipping with Launch.
        </p>
        <Button asChild size="lg">
          <Link to="/submit">Submit Your Product</Link>
        </Button>
      </section>
    </div>
  );
};

export default BlogPostPage;
