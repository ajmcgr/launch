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
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
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
      toast.error('Please login to vote');
      navigate('/auth');
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      if (product.userVote === 1) {
        await supabase.from('votes').delete().eq('product_id', productId).eq('user_id', user.id);
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, userVote: null, netVotes: p.netVotes - 1 } : p));
      } else {
        await supabase.from('votes').upsert({ product_id: productId, user_id: user.id, value: 1 });
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, userVote: 1, netVotes: p.netVotes + 1 } : p));
      }
    } catch (error) {
      console.error('Vote error:', error);
      toast.error('Failed to vote');
    }
  };

  const pageTitle = stackInfo ? `Products built with ${stackInfo.name}` : 'Stack';
  const pageDescription = stackInfo ? `Discover products built with ${stackInfo.name} on Launch` : '';

  return (
    <div className="min-h-screen bg-background py-12">
      <Helmet>
        <title>{pageTitle} - Launch</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`https://trylaunch.ai/tech/${slug}`} />
      </Helmet>
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
          <p className="text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'} built with {stackInfo?.name || slug}
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <SortToggle sort={sortBy} onSortChange={setSortBy} />
          <ViewToggle view={view} onViewChange={setView} />
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
      </div>
    </div>
  );
};

export default StackPage;
