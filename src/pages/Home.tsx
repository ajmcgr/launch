import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { CategoryCloud } from '@/components/CategoryCloud';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyProductVote } from '@/lib/notifications';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
  iconUrl?: string;
  categories: string[];
  netVotes: number;
  userVote?: 1 | null;
  commentCount: number;
  makers: Array<{ username: string; avatar_url?: string }>;
  launch_date?: string;
}

const Home = () => {
  const isMobile = useIsMobile();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('productView');
    return (saved as 'list' | 'grid') || 'list';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<'popular' | 'latest'>('popular');
  const ITEMS_PER_PAGE = 25;
  const MAX_ITEMS = 100;
  
  // Force list view on mobile
  const effectiveView = isMobile ? 'list' : view;

  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
    localStorage.setItem('productView', newView);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchProducts('year');

    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = async (period: 'today' | 'week' | 'month' | 'year') => {
    setLoading(true);
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

      const { data: allProducts, error } = await supabase
        .from('products')
        .select(`
          id,
          slug,
          name,
          tagline,
          launch_date,
          product_media(url, type),
          product_category_map(category_id),
          product_makers(user_id, users(username, avatar_url))
        `)
        .eq('status', 'launched')
        .gte('launch_date', startDate.toISOString());

      if (error) throw error;

      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');

      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

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

      const productIds = allProducts?.map(p => p.id) || [];
      
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

      const formattedProducts: Product[] = (allProducts || [])
        .map((p: any) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          tagline: p.tagline,
          thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
          iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
          categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
          netVotes: voteMap.get(p.id) || 0,
          userVote: userVoteMap.get(p.id) || null,
          commentCount: commentMap.get(p.id) || 0,
          makers: p.product_makers?.map((m: any) => ({
            username: m.users?.username || 'Anonymous',
            avatar_url: m.users?.avatar_url || ''
          })) || [],
          launch_date: p.launch_date
        }))
        .slice(0, MAX_ITEMS);

      setProducts(formattedProducts);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
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
    }).sort((a, b) => b.netVotes - a.netVotes));

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

  const sortedProducts = [...products].sort((a, b) => {
    if (sort === 'popular') {
      return b.netVotes - a.netVotes;
    } else {
      return new Date(b.launch_date || 0).getTime() - new Date(a.launch_date || 0).getTime();
    }
  });

  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  const renderProductList = (productList: Product[]) => {
    if (loading) {
      return <div className="text-center py-12">Loading...</div>;
    }

    if (productList.length === 0) {
      return <div className="text-center py-12 text-muted-foreground">No products found for this period.</div>;
    }

    const productsToRender = effectiveView === 'list' ? (
      <div className="space-y-4">
        {productList.map((product, index) => (
          <LaunchListItem
            key={product.id}
            {...product}
            rank={startIndex + index + 1}
            onVote={handleVote}
          />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productList.map((product, index) => (
          <LaunchCard
            key={product.id}
            {...product}
            rank={startIndex + index + 1}
            onVote={handleVote}
          />
        ))}
      </div>
    );

    return (
      <>
        {productsToRender}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex justify-center mt-8">
          <Link to="/products">
            <Button variant="outline">View All Products</Button>
          </Link>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-reckless font-bold text-foreground mb-2">
            The best new AI products. Every day.
          </h1>
        </div>
        
        <Tabs defaultValue="year" onValueChange={(v) => { fetchProducts(v as any); setCurrentPage(1); }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
              <SortToggle sort={sort} onSortChange={setSort} />
              {!isMobile && <ViewToggle view={view} onViewChange={handleViewChange} />}
            </div>
          </div>

          <TabsContent value="today" className="space-y-6">
            {renderProductList(currentProducts)}
          </TabsContent>

          <TabsContent value="week" className="space-y-6">
            {renderProductList(currentProducts)}
          </TabsContent>

          <TabsContent value="month" className="space-y-6">
            {renderProductList(currentProducts)}
          </TabsContent>

          <TabsContent value="year" className="space-y-6">
            {renderProductList(currentProducts)}
          </TabsContent>
        </Tabs>
      </div>

      <CategoryCloud />

      <div className="container mx-auto px-4 py-12 max-w-3xl">
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
