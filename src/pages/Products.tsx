import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { CompactLaunchListItem } from '@/components/CompactLaunchListItem';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { CATEGORIES } from '@/lib/constants';
import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { PLATFORMS, Platform } from '@/components/PlatformIcons';

const Products = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [topPeriod, setTopPeriod] = useState<'today' | 'week' | 'month' | 'year'>('year');
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<number | null>(null);
  const [archiveYears, setArchiveYears] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [displayCount, setDisplayCount] = useState(30);
  const [view, setView] = useState<'list' | 'grid' | 'compact'>(() => {
    const saved = localStorage.getItem('productView');
    return (saved === 'list' || saved === 'grid' || saved === 'compact') ? saved : 'list';
  });
  const [sort, setSort] = useState<'popular' | 'latest' | 'revenue'>('popular');
  
  // Use the saved view preference
  const effectiveView = view;

  const handleViewChange = (newView: 'list' | 'grid' | 'compact') => {
    setView(newView);
    localStorage.setItem('productView', newView);
  };

  useEffect(() => {
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    if (category) {
      setSelectedCategories([category]);
    }
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  useEffect(() => {
    fetchArchiveYears();
  }, []);

  useEffect(() => {
    setDisplayCount(30); // Reset display count when filters change
    if (selectedArchiveYear) {
      fetchArchivedProducts();
    } else {
      fetchTopProducts();
    }
  }, [selectedCategories, selectedPlatforms, topPeriod, selectedArchiveYear, sort, searchQuery]);

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
          domain_url,
          platforms,
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
        launch_date: p.launch_date,
        thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
        domainUrl: p.domain_url || '',
        platforms: (p.platforms || []) as Platform[],
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

      // Filter by platforms
      if (selectedPlatforms.length > 0) {
        formattedProducts = formattedProducts.filter((p: any) => 
          p.platforms?.some((platform: Platform) => selectedPlatforms.includes(platform))
        );
      }

      if (sort === 'popular') {
        formattedProducts.sort((a: any, b: any) => b.netVotes - a.netVotes);
      } else {
        formattedProducts.sort((a: any, b: any) => 
          new Date(b.launch_date || 0).getTime() - new Date(a.launch_date || 0).getTime()
        );
      }
      
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
            launch_date,
            domain_url,
            platforms,
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
            launch_date: p.launch_date,
            thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
            iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
            domainUrl: p.domain_url || '',
            platforms: (p.platforms || []) as Platform[],
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

      // Filter by platforms
      if (selectedPlatforms.length > 0) {
        formattedProducts = formattedProducts.filter((p: any) => 
          p.platforms?.some((platform: Platform) => selectedPlatforms.includes(platform))
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
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {selectedArchiveYear ? `Products ${selectedArchiveYear}` : 'Products'}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 mx-auto">
          <div className="hidden lg:block lg:col-span-1"></div>
          <div className="lg:col-span-3 space-y-6 max-w-3xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex gap-4 flex-1 max-w-2xl">
                <div className="relative flex-1 flex items-center h-9 border rounded-md bg-background">
                  <Search className="absolute left-3 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Button variant="outline" className="h-9">Search</Button>
              </div>
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <SortToggle sort={sort} onSortChange={setSort} showRevenue={false} />
                <ViewToggle view={view} onViewChange={handleViewChange} />
              </div>
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

            {effectiveView === 'compact' ? (
              <div className="space-y-0">
                {products.slice(0, displayCount).map((product, index) => (
                  <CompactLaunchListItem
                    key={product.id}
                    rank={index + 1}
                    name={product.name}
                    votes={product.netVotes}
                    slug={product.slug}
                    onVote={() => {}}
                    launchDate={product.launch_date}
                    commentCount={0}
                    makers={product.makers}
                    domainUrl={product.domainUrl}
                    categories={product.categories}
                  />
                ))}
              </div>
            ) : effectiveView === 'list' ? (
              <div className="space-y-2">
                {products.slice(0, displayCount).map((product) => (
                  <LaunchListItem
                    key={product.id}
                    {...product}
                    onVote={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.slice(0, displayCount).map((product) => (
                  <LaunchCard
                    key={product.id}
                    {...product}
                    onVote={() => {}}
                  />
                ))}
              </div>
            )}

            {displayCount < products.length && (
              <div className="flex justify-center pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setDisplayCount(prev => Math.min(prev + 30, products.length))}
                  className="border-2 border-muted-foreground/20"
                >
                  Load More
                </Button>
              </div>
            )}
          </div>

          <aside className="lg:col-span-2 space-y-6">
            <Card className="p-6">
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
            </Card>

            <Card className="p-6">
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
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-3">Platforms</h3>
              <div className="space-y-2">
                {PLATFORMS.map((platform) => (
                  <div key={platform.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={selectedPlatforms.includes(platform.id)}
                      onCheckedChange={() => handlePlatformToggle(platform.id)}
                    />
                    <Label htmlFor={`platform-${platform.id}`} className="text-sm cursor-pointer">
                      {platform.label}
                    </Label>
                  </div>
                ))}
              </div>
            </Card>

            {archiveYears.length > 0 && (
              <Card className="p-6">
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
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Products;
