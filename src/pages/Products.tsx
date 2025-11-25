import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { ViewToggle } from '@/components/ViewToggle';
import { CATEGORIES } from '@/lib/constants';
import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [topPeriod, setTopPeriod] = useState<'today' | 'week' | 'month' | 'year'>('year');
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<number | null>(null);
  const [archiveYears, setArchiveYears] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('productView');
    return (saved as 'list' | 'grid') || 'list';
  });

  const handleViewChange = (newView: 'list' | 'grid') => {
    setView(newView);
    localStorage.setItem('productView', newView);
  };

  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategories([category]);
    }
  }, [searchParams]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  useEffect(() => {
    fetchArchiveYears();
  }, []);

  useEffect(() => {
    if (selectedArchiveYear) {
      fetchArchivedProducts();
    } else {
      fetchTopProducts();
    }
  }, [selectedCategories, topPeriod, selectedArchiveYear]);

  const fetchArchiveYears = async () => {
    try {
      const { data, error } = await supabase
        .from('product_archives')
        .select('year')
        .order('year', { ascending: false });

      if (error) throw error;

      const uniqueYears = [...new Set(data?.map(d => d.year) || [])];
      setArchiveYears(uniqueYears);
    } catch (error) {
      console.error('Error fetching archive years:', error);
    }
  };

  const getDateRange = (period: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(now.getFullYear(), 0, 1);
        break;
    }

    return { start: start.toISOString(), end: now.toISOString() };
  };

  const fetchTopProducts = async () => {
    try {
      const dateRange = getDateRange(topPeriod);

      let query = supabase
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
        .gte('launch_date', dateRange.start)
        .lte('launch_date', dateRange.end);

      const { data: allProducts, error } = await query;
      if (error) throw error;

      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');

      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      const { data: categories } = await supabase
        .from('product_categories')
        .select('id, name');

      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

      let formattedProducts = (allProducts || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        netVotes: voteMap.get(p.id) || 0,
        makers: p.product_makers?.map((m: any) => ({
          username: m.users?.username || 'Anonymous',
          avatar_url: m.users?.avatar_url || ''
        })) || []
      }));

      if (selectedCategories.length > 0) {
        formattedProducts = formattedProducts.filter((p: any) => 
          p.categories.some((c: string) => selectedCategories.includes(c))
        );
      }

      formattedProducts.sort((a: any, b: any) => b.netVotes - a.netVotes);
      formattedProducts = formattedProducts.slice(0, 100);

      if (searchQuery) {
        formattedProducts = formattedProducts.filter((p: any) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tagline.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching top products:', error);
    }
  };

  const fetchArchivedProducts = async () => {
    if (!selectedArchiveYear) return;

    try {
      const { data: archives, error } = await supabase
        .from('product_archives')
        .select(`
          product_id,
          rank,
          net_votes,
          products (
            id,
            slug,
            name,
            tagline,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url))
          )
        `)
        .eq('year', selectedArchiveYear)
        .eq('period', topPeriod)
        .order('rank', { ascending: true });

      if (error) throw error;

      const { data: categories } = await supabase
        .from('product_categories')
        .select('id, name');

      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

      let formattedProducts = (archives || [])
        .filter((a: any) => a.products)
        .map((a: any) => {
          const p = a.products;
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            tagline: p.tagline,
            thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
            iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
            categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
            netVotes: a.net_votes,
            makers: p.product_makers?.map((m: any) => ({
              username: m.users?.username || 'Anonymous',
              avatar_url: m.users?.avatar_url || ''
            })) || []
          };
        });

      if (selectedCategories.length > 0) {
        formattedProducts = formattedProducts.filter((p: any) => 
          p.categories.some((c: string) => selectedCategories.includes(c))
        );
      }

      if (searchQuery) {
        formattedProducts = formattedProducts.filter((p: any) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tagline.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching archived products:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">
          {selectedArchiveYear ? `Products ${selectedArchiveYear}` : 'Products'}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">Search</Button>
              </div>
              <ViewToggle view={view} onViewChange={handleViewChange} />
            </div>

            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((cat) => (
                  <Button
                    key={cat}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCategoryToggle(cat)}
                  >
                    {cat} ×
                  </Button>
                ))}
              </div>
            )}

            {view === 'list' ? (
              <div className="space-y-4">
                {products.map((product) => (
                  <LaunchListItem
                    key={product.id}
                    {...product}
                    onVote={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map((product) => (
                  <LaunchCard
                    key={product.id}
                    {...product}
                    onVote={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="lg:col-span-1 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Top Products</h3>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${topPeriod === 'today' && !selectedArchiveYear ? 'bg-muted text-foreground' : ''}`}
                  onClick={() => {
                    setTopPeriod('today');
                    setSelectedArchiveYear(null);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${topPeriod === 'week' && !selectedArchiveYear ? 'bg-muted text-foreground' : ''}`}
                  onClick={() => {
                    setTopPeriod('week');
                    setSelectedArchiveYear(null);
                  }}
                >
                  This Week
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${topPeriod === 'month' && !selectedArchiveYear ? 'bg-muted text-foreground' : ''}`}
                  onClick={() => {
                    setTopPeriod('month');
                    setSelectedArchiveYear(null);
                  }}
                >
                  This Month
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${topPeriod === 'year' && !selectedArchiveYear ? 'bg-muted text-foreground' : ''}`}
                  onClick={() => {
                    setTopPeriod('year');
                    setSelectedArchiveYear(null);
                  }}
                >
                  This Year
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Categories</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <Label htmlFor={category} className="text-sm cursor-pointer">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {archiveYears.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Archived</h3>
                <div className="space-y-2">
                  {archiveYears.map((year) => (
                    <Button
                      key={year}
                      variant="ghost"
                      className={`w-full justify-start ${selectedArchiveYear === year ? 'bg-muted text-foreground' : ''}`}
                      onClick={() => setSelectedArchiveYear(year)}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Products;
