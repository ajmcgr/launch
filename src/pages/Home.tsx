import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LaunchCard } from '@/components/LaunchCard';
import { Newsletter } from '@/components/Newsletter';
import { CategoryCloud } from '@/components/CategoryCloud';
import { supabase } from '@/lib/supabase';
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

      // Fetch products (mock data for now)
      // In production, this would query the actual database
      const mockProducts: Product[] = [
        {
          id: '1',
          slug: 'ai-assistant-pro',
          name: 'AI Assistant Pro',
          tagline: 'Your intelligent productivity companion',
          thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop',
          categories: ['Productivity', 'AI Agents'],
          netVotes: 142,
          makers: [{ username: 'alexdoe', avatar_url: '' }],
        },
        {
          id: '2',
          slug: 'design-system-kit',
          name: 'Design System Kit',
          tagline: 'Build beautiful UIs faster than ever',
          thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
          categories: ['Design & Creative', 'No-code Platforms'],
          netVotes: 98,
          makers: [{ username: 'sarahsmith', avatar_url: '' }],
        },
      ];

      setProducts(mockProducts);
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
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Today's Launches</h1>
        
        <Tabs defaultValue="today" onValueChange={(v) => fetchProducts(v as any)}>
          <TabsList className="mb-8">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
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
