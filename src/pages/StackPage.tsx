import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { buildFaqJsonLd, buildItemListJsonLd, techFaqs, techIntroFallback } from '@/lib/seoFaq';
import {
  builtWithBySlug,
  builtWithPlatforms,
  indexableBuiltWithSlugs,
  MIN_INDEXABLE_BUILT_WITH_PRODUCTS,
} from '@/lib/builtWithPlatforms';
import { setFunnelAttribution, trackFunnelEvent } from '@/lib/funnelTracking';

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
  verifiedMrr?: number | null;
  mrrVerifiedAt?: string | null;
  makers: Array<{ username: string; avatar_url?: string }>;
  launch_date?: string;
}

interface StackInfo {
  id: number;
  name: string;
  slug: string;
}

const ITEMS_PER_PAGE = 30;

const StackPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [stackInfo, setStackInfo] = useState<StackInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [founderCount, setFounderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'list' | 'grid' | 'compact'>('list');
  const [sortBy, setSortBy] = useState<'rated' | 'popular' | 'latest' | 'revenue' | 'maker'>('popular');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const fetchProducts = useCallback(async (pageNum: number, reset = false) => {
    if (!slug) return;

    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);

      // Get stack item
      const { data: stackData, error: stackError } = await supabase
        .from('stack_items')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();

      if (stackError || !stackData) {
        navigate('/404');
        return;
      }

      setStackInfo(stackData);

      // Get product IDs that use this stack item
      const { data: stackMap } = await supabase
        .from('product_stack_map')
        .select('product_id')
        .eq('stack_item_id', stackData.id);

      const productIds = stackMap?.map(s => s.product_id) || [];

      if (productIds.length === 0) {
        setProducts([]);
        setTotalProducts(0);
        setFounderCount(0);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // Hero counts (only on first page load)
      if (pageNum === 0) {
        const [{ data: launchedIds }, { data: makerRows }] = await Promise.all([
          supabase.from('products').select('id').in('id', productIds).eq('status', 'launched'),
          supabase.from('product_makers').select('user_id, product_id').in('product_id', productIds),
        ]);
        const launchedSet = new Set((launchedIds ?? []).map((p: any) => p.id));
        setTotalProducts(launchedSet.size);
        const founders = new Set<string>();
        (makerRows ?? []).forEach((m: any) => { if (launchedSet.has(m.product_id)) founders.add(m.user_id); });
        setFounderCount(founders.size);
      }


      // Fetch products
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('products')
        .select(`
          id, name, tagline, slug, domain_url, launch_date, verified_mrr, mrr_verified_at,
          product_media(url, type),
          product_category_map(category_id, product_categories(name)),
          product_makers(user_id, users(username, avatar_url))
        `)
        .in('id', productIds)
        .eq('status', 'launched')
        .range(from, to);

      if (sortBy === 'latest') {
        query = query.order('launch_date', { ascending: false });
      }

      const { data: productsData, error: productsError } = await query;

      if (productsError) throw productsError;

      // Get vote counts and comment counts
      const ids = productsData?.map(p => p.id) || [];
      const [votesResult, commentsResult, userVotesResult] = await Promise.all([
        supabase.from('product_vote_counts').select('product_id, net_votes').in('product_id', ids),
        Promise.all(ids.map(id => supabase.rpc('get_comment_count', { product_uuid: id }))),
        user ? supabase.from('votes').select('product_id, value').eq('user_id', user.id).in('product_id', ids) : Promise.resolve({ data: [] }),
      ]);

      const votesMap = new Map(votesResult.data?.map(v => [v.product_id, v.net_votes]) || []);
      const commentsMap = new Map(ids.map((id, i) => [id, commentsResult[i]?.data || 0]));
      const userVotesMap = new Map((userVotesResult as any)?.data?.map((v: any) => [v.product_id, v.value]) || []);

      const mapped: Product[] = (productsData || []).map(p => ({
        id: p.id,
        slug: p.slug || '',
        name: p.name || '',
        tagline: p.tagline || '',
        thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url,
        domainUrl: p.domain_url || undefined,
        categories: p.product_category_map?.map((c: any) => c.product_categories?.name).filter(Boolean) || [],
        netVotes: votesMap.get(p.id) || 0,
        userVote: userVotesMap.get(p.id) === 1 ? 1 : null,
        commentCount: commentsMap.get(p.id) || 0,
        verifiedMrr: p.verified_mrr,
        mrrVerifiedAt: p.mrr_verified_at,
        makers: p.product_makers?.map((m: any) => m.users).filter(Boolean) || [],
        launch_date: p.launch_date || undefined,
      }));

      if (sortBy === 'popular') {
        mapped.sort((a, b) => (b.netVotes || 0) - (a.netVotes || 0));
      }

      if (reset || pageNum === 0) {
        setProducts(mapped);
      } else {
        setProducts(prev => [...prev, ...mapped]);
      }

      setHasMore((productsData?.length || 0) >= ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching stack products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [slug, sortBy, user, navigate]);

  useEffect(() => {
    setPage(0);
    setProducts([]);
    fetchProducts(0, true);
  }, [slug, sortBy, fetchProducts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage);
  };

  const handleVote = async (productId: string) => {
    if (!user) {
      toast('Sign up to upvote your favorite launches', {
        action: {
          label: 'Sign up',
          onClick: () => navigate('/auth?mode=signup'),
        },
      });
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const hadVote = product.userVote === 1;

    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, userVote: hadVote ? null : 1, netVotes: Math.max(0, p.netVotes + (hadVote ? -1 : 1)) }
        : p
    ));

    try {
      const { data: existingVote, error: existingVoteError } = await supabase
        .from('votes')
        .select('id, value')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVoteError) throw existingVoteError;

      if (existingVote) {
        if (existingVote.value === 1) {
          const { error: deleteError } = await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);

          if (deleteError) throw deleteError;
        } else {
          const { error: updateError } = await supabase
            .from('votes')
            .update({ value: 1 })
            .eq('id', existingVote.id);

          if (updateError) throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('votes')
          .insert({ product_id: productId, user_id: user.id, value: 1 });

        if (insertError) throw insertError;
      }
    } catch (error) {
      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, userVote: hadVote ? 1 : null, netVotes: Math.max(0, p.netVotes + (hadVote ? 1 : -1)) }
          : p
      ));

      console.error('Vote error:', error);
      toast.error('Failed to vote');
    }
  };

  const platform = slug ? builtWithBySlug.get(slug) : undefined;
  const isIndexable = Boolean(
    platform && slug && indexableBuiltWithSlugs.has(slug) && totalProducts >= MIN_INDEXABLE_BUILT_WITH_PRODUCTS,
  );
  const displayName = platform?.name || stackInfo?.name || slug;
  const productsCount = totalProducts || products.length;
  const pageTitle = platform ? `Apps Built with ${platform.name} (${productsCount}) | Launch` : stackInfo ? `Products built with ${stackInfo.name}` : 'Stack';
  const pageDescription = stackInfo
    ? `Explore ${productsCount} launched products built with ${displayName}. Discover real apps, SaaS products, and AI tools submitted by their makers on Launch.`
    : '';
  const introText = stackInfo ? techIntroFallback(displayName || stackInfo.name, productsCount) : '';
  const faqs = isIndexable && displayName ? techFaqs(displayName, productsCount) : [];
  const canonical = `https://trylaunch.ai/tech/${slug}`;
  const itemListSchema = buildItemListJsonLd(
    `Products built with ${displayName}`,
    products.map((product) => ({ name: product.name, url: `https://trylaunch.ai/launch/${product.slug}` })),
  );
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://trylaunch.ai/' },
      { '@type': 'ListItem', position: 2, name: 'Built with', item: 'https://trylaunch.ai/tech' },
      { '@type': 'ListItem', position: 3, name: `Built with ${displayName}`, item: canonical },
    ],
  };
  const relatedPlatforms = platform
    ? builtWithPlatforms.filter((item) => item.slug !== platform.slug).slice(0, 6)
    : [];

  useEffect(() => {
    if (isIndexable && platform) {
      trackFunnelEvent('seo_built_with_page_view', { page_type: 'built_with', platform: platform.slug });
    }
  }, [isIndexable, platform]);

  return (
    <div className="min-h-screen bg-background py-12">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
        {!isIndexable && <meta name="robots" content="noindex,follow" />}
        {isIndexable && <>
          <meta property="og:type" content="website" />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDescription} />
          <meta property="og:url" content={canonical} />
          <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
          <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        </>}
        {faqs.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(buildFaqJsonLd(faqs))}</script>
        )}
      </Helmet>
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/tech" className="hover:text-foreground">Built with</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{displayName}</span>
        </nav>
        <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                {platform && (
                  <div className={`${platform.plate} h-16 w-16 rounded-2xl border flex items-center justify-center shrink-0 overflow-hidden`}>
                    <img src={platform.logoUrl} alt={`${platform.name} logo`} className="max-h-10 max-w-[80%] object-contain" width={64} height={40} />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl md:text-4xl font-reckless font-bold">
                    {platform ? `Built With ${platform.name}` : `Products built with ${displayName}`}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {platform
                      ? `Discover the best products built with ${platform.name} from the Launch community.`
                      : `${productsCount} ${productsCount === 1 ? 'product' : 'products'} built with ${displayName}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-sm">
                <span><span className="font-semibold text-foreground">{productsCount.toLocaleString()}</span> <span className="text-muted-foreground">{productsCount === 1 ? 'product' : 'products'}</span></span>
                {founderCount > 0 && (
                  <span><span className="font-semibold text-foreground">{founderCount.toLocaleString()}</span> <span className="text-muted-foreground">{founderCount === 1 ? 'founder' : 'founders'}</span></span>
                )}
              </div>
              {introText && !platform && (
                <p className="text-base text-muted-foreground leading-relaxed mt-4 max-w-3xl">
                  {introText}
                </p>
              )}
        </div>

        {platform && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-muted/30 px-5 py-4">
            <div>
              <div className="font-semibold">Built something with {platform.name}?</div>
              <div className="text-sm text-muted-foreground">Launch it free and put it in front of builders looking for new products.</div>
            </div>
            <Button asChild>
              <Link
                to={`/auth?mode=signup&returnTo=${encodeURIComponent('/submit')}`}
                onClick={() => {
                  const attribution = { page_type: 'built_with', platform: platform.slug };
                  setFunnelAttribution(attribution);
                  trackFunnelEvent('seo_built_with_cta_clicked', { ...attribution, placement: 'inline' });
                }}
              >
                Launch your product
              </Link>
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <SortToggle sort={sortBy} onSortChange={setSortBy} />
          <ViewToggle view={view} onViewChange={(v) => setView(v as 'list' | 'grid' | 'compact')} />
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductSkeleton key={i} view={view} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No products found using {stackInfo?.name || slug} yet.</p>
            <Button asChild className="mt-4">
              <Link to="/submit">Submit yours</Link>
            </Button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <LaunchCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                tagline={product.tagline}
                thumbnail={product.thumbnail}
                iconUrl={product.iconUrl}
                categories={product.categories}
                netVotes={product.netVotes}
                userVote={product.userVote}
                commentCount={product.commentCount}
                makers={product.makers}
                onVote={() => handleVote(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
              <LaunchListItem
                key={product.id}
                rank={index + 1}
                id={product.id}
                slug={product.slug}
                name={product.name}
                tagline={product.tagline}
                thumbnail={product.thumbnail}
                iconUrl={product.iconUrl}
                domainUrl={product.domainUrl}
                categories={product.categories}
                netVotes={product.netVotes}
                userVote={product.userVote}
                commentCount={product.commentCount}
                onVote={() => handleVote(product.id)}
                makers={product.makers}
              />
            ))}
          </div>
        )}

        {hasMore && products.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Load More'}
            </Button>
          </div>
        )}

        {faqs.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border/40">
            <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
            <div className="space-y-6">
              {faqs.map((f) => (
                <div key={f.question}>
                  <h3 className="font-semibold mb-1">{f.question}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {relatedPlatforms.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border/40">
            <h2 className="text-2xl font-bold mb-6 font-reckless">Explore more products built with AI</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {relatedPlatforms.map((related) => (
                <Link
                  key={related.slug}
                  to={`/tech/${related.slug}`}
                  className="block rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors px-4 py-3"
                >
                  <div className="font-semibold">Built with {related.name}</div>
                  <div className="text-sm text-muted-foreground">{related.description}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {platform && (
          <section className="mt-16 rounded-xl bg-gradient-to-br from-primary/10 to-muted/30 px-6 py-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold font-reckless mb-3">Launch your {platform.name} product</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-5">Create a permanent product page, collect community feedback, and help the next builder discover what you made.</p>
            <Button asChild size="lg">
              <Link
                to={`/auth?mode=signup&returnTo=${encodeURIComponent('/submit')}`}
                onClick={() => {
                  const attribution = { page_type: 'built_with', platform: platform.slug };
                  setFunnelAttribution(attribution);
                  trackFunnelEvent('seo_built_with_cta_clicked', { ...attribution, placement: 'bottom' });
                }}
              >
                Submit your product
              </Link>
            </Button>
          </section>
        )}
      </div>
    </div>
  );
};

export default StackPage;
