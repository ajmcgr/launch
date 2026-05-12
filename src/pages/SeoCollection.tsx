import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Clock, ArrowRight, Sparkles } from 'lucide-react';
import { LaunchListItem } from '@/components/LaunchListItem';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getSeoCollection, SEO_COLLECTIONS, SeoCollectionConfig } from '@/lib/seoCollections';

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
  iconUrl?: string;
  domainUrl?: string;
  categories: string[];
  netVotes: number;
  userVote?: 1 | null;
  commentCount: number;
  makers: Array<{ username: string; avatar_url?: string }>;
  launch_date?: string;
}

const SITE = 'https://trylaunch.ai';
const MAX_ITEMS = 50;

const SeoCollectionPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const config = useMemo(() => getSeoCollection(slug), [slug]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [updatedAt] = useState(() => new Date());

  useEffect(() => {
    if (!config) {
      navigate('/404', { replace: true });
    }
  }, [config, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!config) return;
    fetchProducts(config);
  }, [slug, user]);

  const fetchProducts = async (cfg: SeoCollectionConfig) => {
    setLoading(true);
    try {
      // 1. Resolve category IDs from keywords (if any)
      let productIdFilter: string[] | null = null;
      if (cfg.categoryKeywords.length > 0) {
        const { data: cats } = await supabase
          .from('product_categories')
          .select('id, name');
        const matchedIds = (cats || [])
          .filter((c) =>
            cfg.categoryKeywords.some((k) => c.name?.toLowerCase().includes(k.toLowerCase()))
          )
          .map((c) => c.id);

        if (matchedIds.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        const { data: maps } = await supabase
          .from('product_category_map')
          .select('product_id')
          .in('category_id', matchedIds)
          .limit(2000);
        productIdFilter = Array.from(new Set((maps || []).map((m) => m.product_id)));
        if (productIdFilter.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch products
      let query = supabase
        .from('products')
        .select(`
          id, slug, name, tagline, launch_date, domain_url,
          product_media(url, type),
          product_category_map(category_id),
          product_makers(user_id, users(username, avatar_url))
        `)
        .eq('status', 'launched');

      if (productIdFilter) {
        query = query.in('id', productIdFilter.slice(0, 1000));
      }

      if (cfg.sort === 'latest') {
        query = query.order('launch_date', { ascending: false }).limit(MAX_ITEMS);
      } else {
        query = query.limit(300); // pull more, then sort by votes client-side
      }

      const { data: productsData, error } = await query;
      if (error) throw error;

      // 3. Vote counts
      const ids = (productsData || []).map((p) => p.id);
      const { data: voteCounts } = ids.length
        ? await supabase.from('product_vote_counts').select('product_id, net_votes').in('product_id', ids)
        : { data: [] as any[] };
      const voteMap = new Map((voteCounts || []).map((v: any) => [v.product_id, v.net_votes || 0]));

      // 4. Categories
      const { data: cats } = await supabase.from('product_categories').select('id, name');
      const catMap = new Map((cats || []).map((c) => [c.id, c.name]));

      // 5. User votes
      const { data: userVotes } = user
        ? await supabase.from('votes').select('product_id, value').eq('user_id', user.id).eq('value', 1)
        : { data: null };
      const userVoteMap = new Map((userVotes || []).map((v: any) => [v.product_id, 1 as const]));

      // 6. Comments
      const { data: comments } = ids.length
        ? await supabase.from('comments').select('product_id').in('product_id', ids)
        : { data: [] as any[] };
      const commentMap = new Map<string, number>();
      (comments || []).forEach((c: any) => commentMap.set(c.product_id, (commentMap.get(c.product_id) || 0) + 1));

      let formatted: Product[] = (productsData || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
        domainUrl: p.domain_url || '',
        categories: p.product_category_map?.map((c: any) => catMap.get(c.category_id)).filter(Boolean) || [],
        netVotes: voteMap.get(p.id) || 0,
        userVote: userVoteMap.get(p.id) || null,
        commentCount: commentMap.get(p.id) || 0,
        makers: p.product_makers?.map((m: any) => ({
          username: m.users?.username || 'Anonymous',
          avatar_url: m.users?.avatar_url || '',
        })).filter((m: any) => m.username !== 'Anonymous') || [],
        launch_date: p.launch_date,
      }));

      if (cfg.sort === 'popular') {
        formatted.sort((a, b) => b.netVotes - a.netVotes);
        formatted = formatted.slice(0, MAX_ITEMS);
      }

      setProducts(formatted);
    } catch (e) {
      console.error('SEO collection fetch error', e);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (productId: string) => {
    if (!user) {
      toast('Sign up to upvote', {
        action: { label: 'Sign up', onClick: () => navigate('/auth?signup=true') },
      });
      return;
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const isUp = p.userVote === 1;
        return { ...p, netVotes: p.netVotes + (isUp ? -1 : 1), userVote: isUp ? null : 1 };
      })
    );
    try {
      const { data: existing } = await supabase
        .from('votes')
        .select('id, value')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        if (existing.value === 1) await supabase.from('votes').delete().eq('id', existing.id);
        else await supabase.from('votes').update({ value: 1 }).eq('id', existing.id);
      } else {
        await supabase.from('votes').insert({ product_id: productId, user_id: user.id, value: 1 });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to record vote');
    }
  };

  if (!config) return null;

  const canonical = `${SITE}/${config.slug}`;
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: config.h1,
    description: config.description,
    itemListElement: products.slice(0, 25).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/launch/${p.slug}`,
      name: p.name,
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: config.h1, item: canonical },
    ],
  };
  const related = config.related
    .map((s) => SEO_COLLECTIONS.find((c) => c.slug === s))
    .filter(Boolean) as SeoCollectionConfig[];

  return (
    <>
      <Helmet>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.description} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={config.title} />
        <meta name="twitter:description" content={config.description} />
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="container mx-auto px-4 py-10 max-w-7xl">
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{config.h1}</span>
        </nav>

        <header className="mb-8 max-w-3xl">
          <h1 className="font-reckless text-4xl md:text-5xl font-bold mb-4">{config.h1}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-4">{config.intro}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Updated daily · {format(updatedAt, 'MMM d, yyyy')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              {products.length} live launches
            </span>
          </div>
        </header>

        {/* Inline CTA */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-muted/30 px-5 py-4">
          <div>
            <div className="font-semibold">{config.cta}</div>
            <div className="text-sm text-muted-foreground">Get featured on Launch with a guaranteed dofollow backlink.</div>
          </div>
          <Button asChild>
            <Link to="/submit">Submit your product <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>

        {loading ? (
          <ProductSkeleton view="list" count={8} />
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No launches found yet — be the first.
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((p, i) => (
              <LaunchListItem
                key={p.id}
                rank={i + 1}
                id={p.id}
                slug={p.slug}
                name={p.name}
                tagline={p.tagline}
                thumbnail={p.thumbnail}
                iconUrl={p.iconUrl}
                domainUrl={p.domainUrl}
                categories={p.categories}
                netVotes={p.netVotes}
                userVote={p.userVote}
                commentCount={p.commentCount}
                makers={p.makers}
                launch_date={p.launch_date}
                onVote={() => handleVote(p.id)}
              />
            ))}
          </div>
        )}

        {/* Related categories */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border/40">
            <h2 className="text-2xl font-bold mb-6 font-reckless">Related collections</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/${r.slug}`}
                  className="block rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors px-4 py-3"
                >
                  <div className="font-semibold">{r.h1}</div>
                  <div className="text-sm text-muted-foreground line-clamp-1">{r.description}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="mt-16 rounded-xl bg-gradient-to-br from-primary/10 to-muted/30 px-6 py-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold font-reckless mb-3">Get featured on Launch</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-5">
            Reach thousands of founders and early adopters. Every launch ships with a guaranteed
            high-authority dofollow backlink to your site.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/submit">Launch your product</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};

export default SeoCollectionPage;
