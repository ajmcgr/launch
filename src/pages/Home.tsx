import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
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

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';

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

const ITEMS_PER_PAGE = 30;
const MAX_HOMEPAGE_PRODUCTS = 100;

const Home = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
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
  const [currentPeriod, setCurrentPeriod] = useState<'today' | 'week' | 'month' | 'year'>('year');
  const [sort, setSort] = useState<'popular' | 'latest'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };
  
  // Force list view on mobile
  const effectiveView = isMobile ? 'list' : view;

  const handleViewChange = (newView: 'list' | 'grid') => {
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
    }
  }, [userLoaded]);

  const fetchProducts = async (period: 'today' | 'week' | 'month' | 'year', currentSort: 'popular' | 'latest', pageNum: number, reset: boolean = false) => {
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
      const to = from + ITEMS_PER_PAGE - 1;

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

        allProducts = sortedByVotes.slice(from, to + 1);
        setHasMore(sortedByVotes.length > to + 1);
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
        setHasMore(allProducts.length === ITEMS_PER_PAGE);
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

  const handleSortChange = (newSort: 'popular' | 'latest') => {
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

    return (
      <>
        {effectiveView === 'list' ? (
          <div className="space-y-4">
            {productList.map((product, index) => (
              <LaunchListItem
                key={product.id}
                {...product}
                rank={index + 1}
                onVote={handleVote}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {productList.map((product, index) => (
              <LaunchCard
                key={product.id}
                {...product}
                rank={index + 1}
                onVote={handleVote}
              />
            ))}
          </div>
        )}
        
        {/* Load More button */}
        {canLoadMore && (
          <div className="flex justify-center pt-6">
            <Button 
              variant="outline" 
              onClick={loadMore}
              disabled={loadingMore}
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
              <Button variant="outline">View all {currentPeriod === 'today' ? "today's" : currentPeriod === 'week' ? "this week's" : currentPeriod === 'month' ? "this month's" : "this year's"} products</Button>
            </Link>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-3xl">
        <div className="hidden md:block text-center mb-8">
          <h1 className="text-4xl font-reckless font-bold text-foreground mb-2">
            The best new AI products. Daily.
          </h1>
        </div>
        
        <Tabs defaultValue="year" onValueChange={(v) => handlePeriodChange(v as any)}>
          <div className="flex flex-row items-center justify-between gap-2 md:gap-4 mb-6 md:mb-8">
            <TabsList className="flex-shrink overflow-x-auto h-9">
              <TabsTrigger value="today" className="text-xs px-2.5 h-7">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2.5 h-7">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2.5 h-7">Month</TabsTrigger>
              <TabsTrigger value="year" className="text-xs px-2.5 h-7">Year</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative w-28 md:w-36 border rounded-md">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                <Input
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  className="pl-8 h-9 text-xs border-0"
                />
              </div>
              <SortToggle sort={sort} onSortChange={handleSortChange} iconOnly={isMobile} />
              {!isMobile && <ViewToggle view={view} onViewChange={handleViewChange} />}
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

      <CategoryCloud />

      <div className="container mx-auto px-4 pt-12 pb-4 max-w-3xl">
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
