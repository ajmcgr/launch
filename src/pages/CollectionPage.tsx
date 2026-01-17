import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { ViewToggle } from '@/components/ViewToggle';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyProductVote } from '@/lib/notifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';

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

interface CollectionInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  intro_copy?: string;
  is_auto_update: boolean;
  updated_at: string;
}

const ITEMS_PER_PAGE = 30;

const CollectionPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('productView');
    return (saved as 'list' | 'grid') || 'list';
  });

  const effectiveView = isMobile ? 'list' : view;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (slug) {
      fetchCollectionInfo();
    }
  }, [slug]);

  useEffect(() => {
    if (collectionInfo) {
      fetchProducts(0, true);
    }
  }, [collectionInfo, user]);

  const fetchCollectionInfo = async () => {
    try {
      const { data: collection, error } = await supabase
        .from('collections')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      
      if (!collection) {
        navigate('/404');
        return;
      }

      setCollectionInfo(collection);
    } catch (error) {
      console.error('Error fetching collection:', error);
      navigate('/404');
    }
  };

  const fetchProducts = async (pageNum: number, reset: boolean = false) => {
    if (!collectionInfo) return;
    
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Get product IDs for this collection (ordered by position)
      const { data: collectionProducts } = await supabase
        .from('collection_products')
        .select('product_id, position')
        .eq('collection_id', collectionInfo.id)
        .order('position', { ascending: true });

      if (!collectionProducts || collectionProducts.length === 0) {
        setProducts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const productIds = collectionProducts.map(cp => cp.product_id);
      const positionMap = new Map(collectionProducts.map(cp => [cp.product_id, cp.position]));

      // Fetch vote counts
      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');

      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      // Fetch products
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          id,
          slug,
          name,
          tagline,
          launch_date,
          domain_url,
          verified_mrr,
          mrr_verified_at,
          product_media(url, type),
          product_category_map(category_id),
          product_makers(user_id, users(username, avatar_url))
        `)
        .eq('status', 'launched')
        .in('id', productIds);

      if (error) throw error;

      // Sort by position in collection
      let sortedProducts = (productsData || []).sort((a, b) => {
        const posA = positionMap.get(a.id) || 0;
        const posB = positionMap.get(b.id) || 0;
        return posA - posB;
      });

      const paginatedProducts = sortedProducts.slice(from, to + 1);
      setHasMore(sortedProducts.length > to + 1);

      const { data: categories } = await supabase
        .from('product_categories')
        .select('id, name');

      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

      const { data: userVotes } = user ? await supabase
        .from('votes')
        .select('product_id, value')
        .eq('user_id', user.id)
        .eq('value', 1) : { data: null };

      const userVoteMap = new Map(userVotes?.map(v => [v.product_id, 1 as const]) || []);

      const { data: allComments } = await supabase
        .from('comments')
        .select('product_id')
        .in('product_id', paginatedProducts.map(p => p.id));

      const commentMap = new Map<string, number>();
      allComments?.forEach(comment => {
        commentMap.set(comment.product_id, (commentMap.get(comment.product_id) || 0) + 1);
      });

      const formattedProducts: Product[] = paginatedProducts.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
        domainUrl: p.domain_url || '',
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        netVotes: voteMap.get(p.id) || 0,
        userVote: userVoteMap.get(p.id) || null,
        commentCount: commentMap.get(p.id) || 0,
        verifiedMrr: p.verified_mrr || null,
        mrrVerifiedAt: p.mrr_verified_at || null,
        makers: p.product_makers?.map((m: any) => ({
          username: m.users?.username || 'Anonymous',
          avatar_url: m.users?.avatar_url || ''
        })).filter((m: any) => m.username !== 'Anonymous') || [],
        launch_date: p.launch_date
      }));

      if (reset) {
        setProducts(formattedProducts);
      } else {
        setProducts(prev => [...prev, ...formattedProducts]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleVote = async (productId: string) => {
    if (!user) {
      toast.error('Please login to vote');
      return;
    }

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const currentVote = p.userVote;
        let newNetVotes = p.netVotes;
        let newUserVote: 1 | null = null;

        if (currentVote === 1) {
          newNetVotes -= 1;
          newUserVote = null;
        } else {
          newNetVotes += 1;
          newUserVote = 1;
        }

        return { ...p, netVotes: newNetVotes, userVote: newUserVote };
      }
      return p;
    }));

    try {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .eq('value', 1)
        .maybeSingle();

      if (existingVote) {
        await supabase.from('votes').delete().eq('id', existingVote.id);
      } else {
        await supabase.from('votes').insert({ product_id: productId, user_id: user.id, value: 1 });
        
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();

        if (userData?.username) {
          notifyProductVote(productId, userData.username);
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, false);
    }
  }, [loadingMore, hasMore, page]);

  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
    localStorage.setItem('productView', newView);
  };

  if (!collectionInfo && loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <ProductSkeleton view="list" count={5} />
      </div>
    );
  }

  const pageTitle = `${collectionInfo?.name || 'Collection'} - Launch`;
  const pageDescription = collectionInfo?.description || 
    `Explore ${collectionInfo?.name}. A curated collection of the best AI apps and tools.`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <link rel="canonical" href={`https://trylaunch.ai/collections/${collectionInfo?.slug}`} />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{collectionInfo?.name}</h1>
          {collectionInfo?.intro_copy && (
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              {collectionInfo.intro_copy}
            </p>
          )}
          {collectionInfo?.updated_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {collectionInfo.is_auto_update ? 'Updated automatically' : 'Last updated'}: {format(new Date(collectionInfo.updated_at), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end mb-6">
          {!isMobile && (
            <ViewToggle view={view} onViewChange={handleViewChange} />
          )}
        </div>

        {loading ? (
          <ProductSkeleton view={effectiveView} count={5} />
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            This collection is empty.
          </div>
        ) : (
          <div className={effectiveView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {products.map((product, index) => (
              effectiveView === 'grid' ? (
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
                  verifiedMrr={product.verifiedMrr}
                  mrrVerifiedAt={product.mrrVerifiedAt}
                  makers={product.makers}
                  onVote={() => handleVote(product.id)}
                />
              ) : (
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
                  verifiedMrr={product.verifiedMrr}
                  mrrVerifiedAt={product.mrrVerifiedAt}
                  makers={product.makers}
                  onVote={() => handleVote(product.id)}
                />
              )
            ))}
          </div>
        )}

        {hasMore && products.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button onClick={loadMore} disabled={loadingMore} variant="outline" className="border-2 border-muted-foreground/20">
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default CollectionPage;
