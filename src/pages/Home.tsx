import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { CompactLaunchListItem } from '@/components/CompactLaunchListItem';
import { CategoryCloud } from '@/components/CategoryCloud';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyProductVote } from '@/lib/notifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { trackSponsorImpression } from '@/hooks/use-sponsor-tracking';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { CommunityCallout } from '@/components/CommunityCallout';

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

const ITEMS_PER_PAGE = 30;
const MAX_HOMEPAGE_PRODUCTS = 100;

const Home = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [sponsoredProducts, setSponsoredProducts] = useState<Map<number, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid' | 'compact'>(() => {
    const saved = localStorage.getItem('productView');
    return (saved === 'list' || saved === 'grid' || saved === 'compact') ? saved : 'list';
  });
  const [currentPeriod, setCurrentPeriod] = useState<'today' | 'week' | 'month' | 'year'>('year');
  const [sort, setSort] = useState<'popular' | 'latest' | 'revenue'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };
  
  // Use the saved view preference (mobile defaults to 'list' if no preference saved)
  const effectiveView = view;

  const handleViewChange = (newView: 'list' | 'grid' | 'compact') => {
    setView(newView);
    localStorage.setItem('productView', newView);
  };

  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch products only once when user state is first determined
  useEffect(() => {
    if (userLoaded) {
      fetchProducts(currentPeriod, sort, 0, true);
      fetchSponsoredProducts();
    }
  }, [userLoaded]);

  const fetchSponsoredProducts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch active sponsored products from the sponsored_products table
      const { data: sponsoredData } = await supabase
        .from('sponsored_products')
        .select(`
          position,
          product_id,
          products!inner(
            id,
            slug,
            name,
            tagline,
            domain_url,
            verified_mrr,
            mrr_verified_at,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          )
        `)
        .lte('start_date', today)
        .gte('end_date', today)
        .in('sponsorship_type', ['website', 'combined'])
        .order('position', { ascending: true });

      if (sponsoredData && sponsoredData.length > 0) {
        const { data: categories } = await supabase
          .from('product_categories')
          .select('id, name');
        const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

        const productIds = sponsoredData.map(s => (s.products as any).id);
        
        const { data: voteCounts } = await supabase
          .from('product_vote_counts')
          .select('product_id, net_votes')
          .in('product_id', productIds);
        
        const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes]) || []);

        let userVotes = new Map<string, 1>();
        if (user) {
          const { data: votes } = await supabase
            .from('votes')
            .select('product_id, value')
            .in('product_id', productIds)
            .eq('user_id', user.id)
            .eq('value', 1);
          votes?.forEach(v => userVotes.set(v.product_id, 1));
        }

        const { data: commentCounts } = await supabase
          .from('comments')
          .select('product_id')
          .in('product_id', productIds);
        
        const commentMap = new Map<string, number>();
        commentCounts?.forEach(c => {
          commentMap.set(c.product_id, (commentMap.get(c.product_id) || 0) + 1);
        });

        const sponsoredMap = new Map<number, Product>();
        
        sponsoredData.forEach(sponsored => {
          const product = sponsored.products as any;
          sponsoredMap.set(sponsored.position, {
            id: product.id,
            slug: product.slug,
            name: product.name,
            tagline: product.tagline,
            thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
            iconUrl: product.product_media?.find((m: any) => m.type === 'icon')?.url || '',
            domainUrl: product.domain_url || '',
            categories: product.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
            netVotes: voteMap.get(product.id) || 0,
            userVote: userVotes.get(product.id) || null,
            commentCount: commentMap.get(product.id) || 0,
            verifiedMrr: product.verified_mrr || null,
            mrrVerifiedAt: product.mrr_verified_at || null,
            makers: product.product_makers?.map((m: any) => ({
              username: m.users?.username || 'Anonymous',
              avatar_url: m.users?.avatar_url || ''
            })) || [],
          });
        });

        setSponsoredProducts(sponsoredMap);
      }
    } catch (error) {
      console.error('Error fetching sponsored products:', error);
    }
  };

  const fetchProducts = async (period: 'today' | 'week' | 'month' | 'year', currentSort: 'popular' | 'latest' | 'revenue', pageNum: number, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      const from = pageNum * ITEMS_PER_PAGE;
      const to = Math.min(from + ITEMS_PER_PAGE - 1, MAX_HOMEPAGE_PRODUCTS - 1);

      // Fetch vote counts first if sorting by popular
      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');

      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      let allProducts: any[] = [];

      if (currentSort === 'popular') {
        // For popular sorting, we need to fetch all products in the period and sort by votes
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
          .gte('launch_date', startDate.toISOString());

        if (error) throw error;

        // Sort by votes client-side and then paginate
        const sortedByVotes = (productsData || []).sort((a, b) => {
          const votesA = voteMap.get(a.id) || 0;
          const votesB = voteMap.get(b.id) || 0;
          return votesB - votesA;
        });

        // Cap to MAX_HOMEPAGE_PRODUCTS total
        const cappedProducts = sortedByVotes.slice(0, MAX_HOMEPAGE_PRODUCTS);
        allProducts = cappedProducts.slice(from, to + 1);
        setHasMore(cappedProducts.length > to + 1 && to + 1 < MAX_HOMEPAGE_PRODUCTS);
      } else if (currentSort === 'revenue') {
        // For revenue sorting, fetch all and sort by verified_mrr
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
          .gte('launch_date', startDate.toISOString())
          .not('verified_mrr', 'is', null);

        if (error) throw error;

        // Sort by verified_mrr descending
        const sortedByRevenue = (productsData || []).sort((a, b) => {
          return (b.verified_mrr || 0) - (a.verified_mrr || 0);
        });

        // Cap to MAX_HOMEPAGE_PRODUCTS total
        const cappedProducts = sortedByRevenue.slice(0, MAX_HOMEPAGE_PRODUCTS);
        allProducts = cappedProducts.slice(from, to + 1);
        setHasMore(cappedProducts.length > to + 1 && to + 1 < MAX_HOMEPAGE_PRODUCTS);
      } else {
        // For latest sorting, use database ordering with pagination
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
          .gte('launch_date', startDate.toISOString())
          .order('launch_date', { ascending: false })
          .range(from, to);

        if (error) throw error;
        allProducts = productsData || [];
        setHasMore(allProducts.length === ITEMS_PER_PAGE && to + 1 < MAX_HOMEPAGE_PRODUCTS);
      }

      const productIds = allProducts.map(p => p.id);

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

      // Fetch all comments in a single query
      const { data: allComments } = await supabase
        .from('comments')
        .select('product_id')
        .in('product_id', productIds);

      // Count comments per product
      const commentMap = new Map<string, number>();
      allComments?.forEach(comment => {
        const currentCount = commentMap.get(comment.product_id) || 0;
        commentMap.set(comment.product_id, currentCount + 1);
      });

      const formattedProducts: Product[] = allProducts.map((p: any) => ({
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
        })) || [],
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

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && products.length < MAX_HOMEPAGE_PRODUCTS) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(currentPeriod, sort, nextPage, false);
    }
  }, [loadingMore, hasMore, page, currentPeriod, sort, products.length]);

  // Check if we've hit the homepage limit
  const canLoadMore = hasMore && products.length < MAX_HOMEPAGE_PRODUCTS;

  const handlePeriodChange = (period: 'today' | 'week' | 'month' | 'year') => {
    setCurrentPeriod(period);
    setPage(0);
    setProducts([]);
    setHasMore(true);
    fetchProducts(period, sort, 0, true);
  };

  const handleSortChange = (newSort: 'popular' | 'latest' | 'revenue') => {
    setSort(newSort);
    setPage(0);
    setProducts([]);
    setHasMore(true);
    fetchProducts(currentPeriod, newSort, 0, true);
  };

  const handleVote = async (productId: string) => {
    if (!user) {
      toast.error('Please login to vote');
      return;
    }

    // Optimistic update
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const currentVote = p.userVote;
        let newNetVotes = p.netVotes;
        let newUserVote: 1 | null = null;

        if (currentVote === 1) {
          // Remove vote
          newNetVotes -= 1;
          newUserVote = null;
        } else {
          // Add vote
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
        
        // Send notification to product owner
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

  // Products are now sorted from the database/fetch, no need for client-side sorting

  const renderProductList = (productList: Product[]) => {
    if (loading) {
      return <ProductSkeleton view={effectiveView} count={5} />;
    }

    if (productList.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">No products found for this period.</div>;
    }

    // Helper to render products with sponsored items at their positions
    const renderProductsWithSponsored = (viewMode: 'list' | 'grid' | 'compact') => {
      const items: React.ReactNode[] = [];
      let productIndex = 0;
      
      // Position 1 sponsored product goes at the top (skip for compact view)
      const pos1Sponsor = sponsoredProducts.get(1);
      if (pos1Sponsor && viewMode !== 'compact') {
        // Track impression for position 1
        trackSponsorImpression(pos1Sponsor.id, 1);
        items.push(
          <LaunchListItem
            key={`sponsored-1`}
            {...pos1Sponsor}
            sponsored
            sponsoredPosition={1}
            onVote={handleVote}
          />
        );
      }
      
      // Interleave products with sponsored items at positions 10, 20, 30
      productList.forEach((product, idx) => {
        productIndex++;
        const displayRank = productIndex;
        
        if (viewMode === 'compact') {
          items.push(
            <CompactLaunchListItem
              key={product.id}
              rank={displayRank}
              name={product.name}
              votes={product.netVotes}
              slug={product.slug}
              userVote={product.userVote}
              onVote={() => handleVote(product.id)}
              launchDate={product.launch_date}
              commentCount={product.commentCount}
              makers={product.makers}
              domainUrl={product.domainUrl}
            />
          );
        } else if (viewMode === 'list') {
          items.push(
            <LaunchListItem
              key={product.id}
              {...product}
              rank={displayRank}
              onVote={handleVote}
            />
          );
        } else {
          items.push(
            <LaunchCard
              key={product.id}
              {...product}
              rank={displayRank}
              onVote={handleVote}
            />
          );
        }
        
        // Check if there's a sponsored product for the next position (skip for compact)
        // Position 2 = after 10 products, Position 3 = after 20 products, etc.
        if (viewMode !== 'compact') {
          const sponsorPositionCheck = productIndex + 1;
          const sponsorPosition = sponsorPositionCheck === 10 ? 2 : sponsorPositionCheck === 20 ? 3 : sponsorPositionCheck === 30 ? 4 : null;
          if (sponsorPosition) {
            const sponsor = sponsoredProducts.get(sponsorPosition);
            if (sponsor) {
              // Track impression for this position
              trackSponsorImpression(sponsor.id, sponsorPosition);
              items.push(
                <LaunchListItem
                  key={`sponsored-${sponsorPosition}`}
                  {...sponsor}
                  sponsored
                  sponsoredPosition={sponsorPosition}
                  onVote={handleVote}
                />
              );
            }
          }
        }
      });
      
      return items;
    };

    return (
      <>
        {effectiveView === 'compact' ? (
          <div className="space-y-0">
            {renderProductsWithSponsored('compact')}
          </div>
        ) : effectiveView === 'list' ? (
          <div className="space-y-2">
            {renderProductsWithSponsored('list')}
          </div>
        ) : (
          <div className="space-y-4">
            {renderProductsWithSponsored('grid')}
          </div>
        )}
        
        {/* Load More button */}
        {canLoadMore && (
          <div className="flex justify-center pt-6">
            <Button 
              variant="outline" 
              onClick={loadMore}
              disabled={loadingMore}
              className="border-2 border-muted-foreground/20"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
        
        {/* View all link when limit reached or no more products */}
        {(!canLoadMore && productList.length > 0) && (
          <div className="flex justify-center pt-4">
            <Link to={`/products?period=${currentPeriod}`}>
              <Button variant="outline" className="border-2 border-muted-foreground/20">View all {currentPeriod === 'today' ? "today's" : currentPeriod === 'week' ? "this week's" : currentPeriod === 'month' ? "this month's" : "this year's"} products</Button>
            </Link>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-3 md:py-4 max-w-4xl">
        <Tabs defaultValue="week" onValueChange={(v) => handlePeriodChange(v as any)}>
          <div className="flex flex-row items-center justify-between gap-2 mb-4">
            <TabsList className="flex-shrink h-8 bg-transparent border rounded-md p-0.5 gap-0.5 overflow-hidden">
              <TabsTrigger value="today" className="text-xs px-2 h-6 data-[state=active]:bg-muted data-[state=active]:shadow-none hover:bg-muted/50 transition-colors">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2 h-6 data-[state=active]:bg-muted data-[state=active]:shadow-none hover:bg-muted/50 transition-colors">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2 h-6 data-[state=active]:bg-muted data-[state=active]:shadow-none hover:bg-muted/50 transition-colors">Month</TabsTrigger>
              <TabsTrigger value="year" className="text-xs px-2 h-6 data-[state=active]:bg-muted data-[state=active]:shadow-none hover:bg-muted/50 transition-colors">Year</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="hidden md:flex items-center relative w-32 h-9 border rounded-md bg-background">
                <Search className="absolute left-2 text-muted-foreground h-3.5 w-3.5" />
                <Input
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  className="pl-7 h-full text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <SortToggle sort={sort} onSortChange={handleSortChange} iconOnly={isMobile} showRevenue={true} />
              <ViewToggle view={view} onViewChange={handleViewChange} />
            </div>
          </div>

          <TabsContent value="today" className="space-y-6">
            {renderProductList(products)}
          </TabsContent>

          <TabsContent value="week" className="space-y-6">
            {renderProductList(products)}
          </TabsContent>

          <TabsContent value="month" className="space-y-6">
            {renderProductList(products)}
          </TabsContent>

          <TabsContent value="year" className="space-y-6">
            {renderProductList(products)}
          </TabsContent>
        </Tabs>
      </div>

      <CommunityCallout />

      <CategoryCloud />

      <div className="container mx-auto px-4 pt-6 pb-4 max-w-4xl">
        <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
        
        <Accordion type="single" collapsible className="w-full space-y-4">
          <AccordionItem value="what-is" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left text-sm">
              What is Launch?
            </AccordionTrigger>
            <AccordionContent>
              Launch is a platform for launching and discovering new AI products. Makers can submit their products, get feedback from the community, and compete for daily, weekly, monthly, and yearly rankings.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="how-submit" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left text-sm">
              How do I submit my product?
            </AccordionTrigger>
            <AccordionContent>
              Create an account, click "Submit" in the menu, fill out your product details, and choose your launch date. You can even schedule launches in advance!
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="voting" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left text-sm">
              How does voting work?
            </AccordionTrigger>
            <AccordionContent>
              Users can upvote products they find interesting. Products are ranked based on their votes within specific time periods (Today, This Week, This Month, This Year). You must be logged in to vote.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="top-products" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left text-sm">
              What are Top Products and Archives?
            </AccordionTrigger>
            <AccordionContent>
              Top Products show the top 100 products for each time period. At the end of each year, we automatically archive these rankings so you can explore past winners. Visit the Products page to see current rankings and archives.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notifications" className="border rounded-lg px-6">
            <AccordionTrigger className="text-left text-sm">
              How do notifications work?
            </AccordionTrigger>
            <AccordionContent>
              Get notified when someone votes on your product, comments, or when people you follow launch new products. Customize your notification preferences in Settings.
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="text-center mt-8">
          <Link to="/faq">
            <Button variant="outline">View All FAQs</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
