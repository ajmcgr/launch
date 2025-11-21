import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { Newsletter } from '@/components/Newsletter';
import { CategoryCloud } from '@/components/CategoryCloud';
import { ViewToggle } from '@/components/ViewToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
  categories: string[];
  netVotes: number;
  userVote?: 1 | -1 | null;
  makers: Array<{ username: string; avatar_url?: string }>;
}

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('productView');
    return (saved as 'list' | 'grid') || 'list';
  });

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

    fetchProducts('today');

    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = async (period: 'today' | 'week' | 'month') => {
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
        .gte('launch_date', startDate.toISOString())
        .order('launch_date', { ascending: false });

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
        .eq('user_id', user.id) : { data: null };

      const userVoteMap = new Map(userVotes?.map(v => [v.product_id, v.value]) || []);

      const formattedProducts: Product[] = (allProducts || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        netVotes: voteMap.get(p.id) || 0,
        userVote: userVoteMap.get(p.id) as 1 | -1 | undefined,
        makers: p.product_makers?.map((m: any) => ({
          username: m.users?.username || 'Anonymous',
          avatar_url: m.users?.avatar_url || ''
        })) || []
      }));

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (productId: string, value: 1 | -1) => {
    if (!user) {
      toast.error('Please login to vote');
      return;
    }

    // Optimistic update
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const currentVote = p.userVote;
        let newNetVotes = p.netVotes;
        let newUserVote: 1 | -1 | null = value;

        if (currentVote === value) {
          // Remove vote
          newNetVotes -= value;
          newUserVote = null;
        } else if (currentVote) {
          // Flip vote
          newNetVotes += (value * 2);
        } else {
          // New vote
          newNetVotes += value;
        }

        return { ...p, netVotes: newNetVotes, userVote: newUserVote };
      }
      return p;
    }));

    try {
      // In production, this would sync with the database
      // await supabase.from('votes').upsert({...})
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-reckless font-bold text-foreground mb-2">
            The best new AI products. Every day.
          </h1>
        </div>
        
        <Tabs defaultValue="today" onValueChange={(v) => fetchProducts(v as any)}>
          <div className="flex flex-row items-center justify-between gap-4 mb-8">
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>
            <ViewToggle view={view} onViewChange={handleViewChange} />
          </div>

          <TabsContent value="today" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : view === 'list' ? (
              <div className="space-y-4">
                {products.map((product) => (
                  <LaunchListItem
                    key={product.id}
                    {...product}
                    onVote={handleVote}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <LaunchCard
                    key={product.id}
                    {...product}
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : view === 'list' ? (
              <div className="space-y-4">
                {products.map((product) => (
                  <LaunchListItem
                    key={product.id}
                    {...product}
                    onVote={handleVote}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <LaunchCard
                    key={product.id}
                    {...product}
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="month" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : view === 'list' ? (
              <div className="space-y-4">
                {products.map((product) => (
                  <LaunchListItem
                    key={product.id}
                    {...product}
                    onVote={handleVote}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <LaunchCard
                    key={product.id}
                    {...product}
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CategoryCloud />
      <Newsletter />
    </div>
  );
};

export default Home;
