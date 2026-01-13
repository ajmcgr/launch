import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LaunchCard } from '@/components/LaunchCard';
import { LaunchListItem } from '@/components/LaunchListItem';
import { CompactLaunchListItem } from '@/components/CompactLaunchListItem';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { CATEGORIES } from '@/lib/constants';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Platform } from '@/components/PlatformIcons';
import { PlatformFilter } from '@/components/PlatformFilter';
import { toast } from 'sonner';

const Products = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [topPeriod, setTopPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('year');
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<number | null>(null);
  const [archiveYears, setArchiveYears] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [displayCount, setDisplayCount] = useState(30);
  const [view, setView] = useState<'list' | 'grid' | 'compact'>(() => {
    const saved = localStorage.getItem('productView');
    return (saved === 'list' || saved === 'grid' || saved === 'compact') ? saved : 'list';
  });
  const [sort, setSort] = useState<'popular' | 'latest' | 'revenue'>('popular');
  const [user, setUser] = useState<any>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  
  // Use the saved view preference
  const effectiveView = view;

  const handleViewChange = (newView: 'list' | 'grid' | 'compact') => {
    setView(newView);
    localStorage.setItem('productView', newView);
  };

  // Fetch user session and votes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserVotes(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserVotes(session.user.id);
      } else {
        setUserVotes(new Set());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserVotes = async (userId: string) => {
    const { data } = await supabase
      .from('votes')
      .select('product_id')
      .eq('user_id', userId);
    
    if (data) {
      setUserVotes(new Set(data.map(v => v.product_id)));
    }
  };

  const handleVote = async (productId: string) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    try {
      const hasVoted = userVotes.has(productId);

      if (hasVoted) {
        await supabase
          .from('votes')
          .delete()
          .eq('product_id', productId)
          .eq('user_id', user.id);
        
        setUserVotes(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        
        setProducts(prev => 
          prev.map(p => 
            p.id === productId 
              ? { ...p, netVotes: p.netVotes - 1 }
              : p
          )
        );
      } else {
        await supabase
          .from('votes')
          .insert({ product_id: productId, user_id: user.id, value: 1 });
        
        setUserVotes(prev => new Set(prev).add(productId));
        
        setProducts(prev => 
          prev.map(p => 
            p.id === productId 
              ? { ...p, netVotes: p.netVotes + 1 }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
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
      // Get years from products that have launched (for archive browsing)
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('products')
        .select('launch_date')
        .eq('status', 'launched')
        .not('launch_date', 'is', null);

      if (error) throw error;

      // Extract unique years from launch dates, excluding current year
      const years = data
        ?.map(p => new Date(p.launch_date!).getFullYear())
        .filter(year => year < currentYear) || [];
      const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
      setArchiveYears(uniqueYears);
    } catch (error) {
      console.error('Error fetching archive years:', error);
    }
  };

  const getDateRange = (period: 'today' | 'week' | 'month' | 'year' | 'all') => {
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
        start.setFullYear(now.getFullYear(), 0, 1); // Jan 1 of current year
        break;
      case 'all':
        start.setFullYear(2000); // Far past date to include all products
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
          verified_mrr,
          mrr_verified_at,
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
        verifiedMrr: p.verified_mrr || null,
        mrrVerifiedAt: p.mrr_verified_at || null,
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
      } else if (sort === 'revenue') {
        // Filter to only products with verified MRR, then sort by MRR
        formattedProducts = formattedProducts.filter((p: any) => p.verifiedMrr !== null && p.verifiedMrr > 0);
        formattedProducts.sort((a: any, b: any) => (b.verifiedMrr || 0) - (a.verifiedMrr || 0));
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
      // For archive years, fetch products directly by launch_date year instead of using product_archives
      const startOfYear = new Date(selectedArchiveYear, 0, 1).toISOString();
      const endOfYear = new Date(selectedArchiveYear, 11, 31, 23, 59, 59).toISOString();

      const { data: allProducts, error } = await supabase
        .from('products')
        .select(`
          id,
          slug,
          name,
          tagline,
          launch_date,
          domain_url,
          platforms,
          verified_mrr,
          mrr_verified_at,
          product_media(url, type),
          product_category_map(category_id),
          product_makers(user_id, users(username, avatar_url))
        `)
        .eq('status', 'launched')
        .gte('launch_date', startOfYear)
        .lte('launch_date', endOfYear);

      if (error) throw error;

      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');

      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      if (error) throw error;

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
        verifiedMrr: p.verified_mrr || null,
        mrrVerifiedAt: p.mrr_verified_at || null,
        makers: p.product_makers?.map((m: any) => ({
          username: m.users?.username || 'Anonymous',
          avatar_url: m.users?.avatar_url || ''
        })) || []
      }));

      // Sort based on current sort option
      if (sort === 'popular') {
        formattedProducts.sort((a: any, b: any) => b.netVotes - a.netVotes);
      } else if (sort === 'revenue') {
        // Filter to only products with verified MRR, then sort by MRR
        formattedProducts = formattedProducts.filter((p: any) => p.verifiedMrr !== null && p.verifiedMrr > 0);
        formattedProducts.sort((a: any, b: any) => (b.verifiedMrr || 0) - (a.verifiedMrr || 0));
      } else {
        formattedProducts.sort((a: any, b: any) => 
          new Date(b.launch_date || 0).getTime() - new Date(a.launch_date || 0).getTime()
        );
      }

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

  // Simple random sizing for visual interest in category cloud
  const getSizeClass = (index: number) => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
    return sizes[index % sizes.length];
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {selectedArchiveYear ? `All Products ${selectedArchiveYear}` : 'All Products'}
        </h1>

        {/* Filters Row - matching homepage style */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Time Period Toggle */}
              <div className="flex items-center gap-1 border rounded-md p-1 h-9">
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                  { value: 'year', label: 'Year' },
                  { value: 'all', label: 'All-Time' },
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={() => {
                      setTopPeriod(period.value as 'today' | 'week' | 'month' | 'year' | 'all');
                      setSelectedArchiveYear(null);
                    }}
                    className={`px-2 h-7 text-xs font-medium rounded-md transition-all ${
                      topPeriod === period.value && !selectedArchiveYear
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative flex items-center h-9 border rounded-md bg-background w-48">
                <Search className="absolute left-3 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PlatformFilter 
                selectedPlatforms={selectedPlatforms} 
                onPlatformToggle={handlePlatformToggle} 
              />
              <SortToggle sort={sort} onSortChange={setSort} showRevenue={true} />
              {!isMobile && <ViewToggle view={view} onViewChange={handleViewChange} />}
            </div>
          </div>
        </div>

        {/* Selected categories tags */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategories([])}
              className="text-muted-foreground"
            >
              Clear all
            </Button>
          </div>
        )}

        {effectiveView === 'compact' ? (
          <div className="space-y-0 mb-8">
          {products.slice(0, displayCount).map((product, index) => (
              <CompactLaunchListItem
                key={product.id}
                rank={index + 1}
                name={product.name}
                votes={product.netVotes}
                slug={product.slug}
                onVote={() => handleVote(product.id)}
                userVote={userVotes.has(product.id) ? 1 : null}
                launchDate={product.launch_date}
                commentCount={0}
                makers={product.makers}
                domainUrl={product.domainUrl}
                categories={product.categories}
                verifiedMrr={product.verifiedMrr}
                mrrVerifiedAt={product.mrrVerifiedAt}
              />
            ))}
          </div>
        ) : effectiveView === 'list' ? (
          <div className="divide-y mb-8">
            {products.slice(0, displayCount).map((product, index) => (
              <LaunchListItem
                key={product.id}
                {...product}
                rank={index + 1}
                onVote={() => handleVote(product.id)}
                userVote={userVotes.has(product.id) ? 1 : null}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {products.slice(0, displayCount).map((product, index) => (
              <LaunchCard
                key={product.id}
                {...product}
                rank={index + 1}
                onVote={() => handleVote(product.id)}
                userVote={userVotes.has(product.id) ? 1 : null}
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

        {/* Category Cloud */}
        <div className="pt-8 mt-8 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">Browse by Category</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((category, index) => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`${getSizeClass(index)} px-4 py-2 rounded-full border transition-all hover:scale-105 ${
                  selectedCategories.includes(category)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-primary hover:border-primary'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Archive Years */}
        {archiveYears.length > 0 && (
          <div className="pt-8 mt-8">
            <h2 className="text-2xl font-bold text-center mb-6">Browse Archives</h2>
            <div className="flex flex-wrap justify-center gap-2">
              {archiveYears.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedArchiveYear(year)}
                  className={`px-4 py-2 rounded-full border transition-all hover:scale-105 ${
                    selectedArchiveYear === year
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-primary hover:border-primary'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
