import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, slug, title, excerpt, cover_image_url, tags, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);
      setPosts(data || []);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
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

      <header className="mb-10 text-center">
        <h1 className="font-reckless text-4xl md:text-5xl mb-3">The Launch Blog</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Playbooks, tactics, and case studies for founders, indie hackers, and makers
          shipping AI and tech products.
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>New articles arriving soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="group">
              <Card className="h-full overflow-hidden hover:border-foreground/20 transition-colors">
                {post.cover_image_url && (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      loading="lazy"
                      width={640}
                      height={360}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 2).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <h2 className="font-reckless text-xl leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  )}
                  {post.published_at && (
                    <p className="text-xs text-muted-foreground pt-1">
                      {format(new Date(post.published_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog;
