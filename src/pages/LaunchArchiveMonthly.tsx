import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isFuture, isThisMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CompactLaunchListItem } from '@/components/CompactLaunchListItem';
import { LaunchListItem } from '@/components/LaunchListItem';
import { LaunchCard } from '@/components/LaunchCard';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { PlatformFilter } from '@/components/PlatformFilter';
import { Platform } from '@/components/PlatformIcons';
import { BreadcrumbSchema } from '@/components/JsonLd';
import { ProductSkeleton } from '@/components/ProductSkeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
  iconUrl?: string;
  domainUrl?: string;
  categories: string[];
  platforms?: Platform[];
  netVotes: number;
  userVote?: 1 | null;
  commentCount: number;
  verifiedMrr?: number | null;
  mrrVerifiedAt?: string | null;
  makers: Array<{ username: string; avatar_url?: string }>;
  launch_date?: string;
}

const LaunchArchiveMonthly = () => {
  const { year, period } = useParams<{ year: string; period: string }>();
  const month = period?.startsWith('m') ? period.slice(1) : period; // period comes as "m02" format
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid' | 'compact'>(() => {
    const savedView = localStorage.getItem('productView');
    return (savedView === 'grid' || savedView === 'list' || savedView === 'compact') ? savedView : 'list';
  });
  const [sort, setSort] = useState<'rated' | 'popular' | 'latest' | 'revenue'>('popular');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const effectiveView = view;

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // Parse year and month
  const parsedYear = parseInt(year || '', 10);
  const parsedMonth = parseInt(month || '', 10);
  const isValidParams = !isNaN(parsedYear) && !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12;

  // Get the date for this month
  const getMonthDate = () => {
    if (!isValidParams) return new Date();
    return new Date(parsedYear, parsedMonth - 1, 1);
  };

  const monthDate = getMonthDate();
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const isFutureMonth = isValidParams && isFuture(monthStart) && !isThisMonth(monthDate);
  const isCurrentMonth = isThisMonth(monthDate);

  // Navigation
  const prevMonthDate = subMonths(monthDate, 1);
  const nextMonthDate = addMonths(monthDate, 1);
  const canGoNext = !isFuture(startOfMonth(nextMonthDate)) || isThisMonth(nextMonthDate);

  const formatMonthUrl = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `/launches/${y}/m${m}`;
  };

  useEffect(() => {
    localStorage.setItem('productView', view);
  }, [view]);

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
    if (!isValidParams || isFutureMonth) return;
    fetchProducts();
  }, [year, month, isValidParams, isFutureMonth, user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const startDate = new Date(Date.UTC(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        monthStart.getDate(),
        0, 0, 0, 0
      ));
      const endDate = new Date(Date.UTC(
        monthEnd.getFullYear(),
        monthEnd.getMonth(),
        monthEnd.getDate(),
        23, 59, 59, 999
      ));

      const { data: productsData, error } = await supabase
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
        .gte('launch_date', startDate.toISOString())
        .lte('launch_date', endDate.toISOString())
        .order('launch_date', { ascending: false });

      if (error) throw error;

      const productIds = (productsData || []).map(p => p.id);

      // Fetch vote counts
      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');
      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      // Fetch rating stats
      const { data: ratingStats } = await supabase
        .from('product_rating_stats')
        .select('product_id, average_rating, rating_count');
      const ratingMap = new Map(ratingStats?.map(r => [r.product_id, { avg: r.average_rating || 0, count: r.rating_count || 0 }]) || []);

      // Fetch categories
      const { data: categories } = await supabase
        .from('product_categories')
        .select('id, name');
      const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

      // Fetch user votes if logged in
      const { data: userVotes } = user ? await supabase
        .from('votes')
        .select('product_id, value')
        .eq('user_id', user.id)
        .eq('value', 1) : { data: null };
      const userVoteMap = new Map(userVotes?.map(v => [v.product_id, 1 as const]) || []);

      // Fetch comment counts
      const { data: allComments } = await supabase
        .from('comments')
        .select('product_id')
        .in('product_id', productIds);
      const commentMap = new Map<string, number>();
      allComments?.forEach(comment => {
        const currentCount = commentMap.get(comment.product_id) || 0;
        commentMap.set(comment.product_id, currentCount + 1);
      });

      const formattedProducts: Product[] = (productsData || []).map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
        iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url || '',
        domainUrl: p.domain_url || '',
        categories: p.product_category_map?.map((c: any) => categoryMap.get(c.category_id)).filter(Boolean) || [],
        platforms: (p.platforms || []) as Platform[],
        netVotes: voteMap.get(p.id) || 0,
        userVote: userVoteMap.get(p.id) || null,
        commentCount: commentMap.get(p.id) || 0,
        verifiedMrr: p.verified_mrr || null,
        mrrVerifiedAt: p.mrr_verified_at || null,
        makers: p.product_makers?.map((m: any) => ({
          username: m.users?.username || 'Anonymous',
          avatar_url: m.users?.avatar_url || ''
        })).filter((m: any) => m.username !== 'Anonymous') || [],
        launch_date: p.launch_date,
      }));

      // Sort by votes (popular) by default
      const sortedProducts = formattedProducts.sort((a, b) => b.netVotes - a.netVotes);

      setProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSort: 'rated' | 'popular' | 'latest' | 'revenue') => {
    setSort(newSort);
    
    const sorted = [...products].sort((a, b) => {
      if (newSort === 'popular') {
        return b.netVotes - a.netVotes;
      } else if (newSort === 'latest') {
        return new Date(b.launch_date || 0).getTime() - new Date(a.launch_date || 0).getTime();
      } else if (newSort === 'revenue') {
        return (b.verifiedMrr || 0) - (a.verifiedMrr || 0);
      } else if (newSort === 'rated') {
        return b.netVotes - a.netVotes;
      }
      return 0;
    });
    
    setProducts(sorted);
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
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to record vote');
    }
  };

  if (!isValidParams) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-5xl text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Month</h1>
          <p className="text-muted-foreground mb-6">The URL format should be /launches/YYYY/mMM (e.g., /launches/2025/m01)</p>
          <Link to="/launches/today">
            <Button>View Today's Launches</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isFutureMonth) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-5xl text-center">
          <h1 className="text-2xl font-bold mb-4">Future Month</h1>
          <p className="text-muted-foreground mb-6">
            {format(monthDate, 'MMMM yyyy')} hasn't started yet. Check back later!
          </p>
          <Link to="/launches/today">
            <Button>View Today's Launches</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = isCurrentMonth 
    ? "This Month's Launches" 
    : `${format(monthDate, 'MMMM yyyy')} Launches`;
  const metaDescription = `Discover the top product launches from ${format(monthDate, 'MMMM yyyy')}. Vote for your favorites and explore the best new tools and apps.`;

  // Filter products by platform
  const filteredProducts = selectedPlatforms.length > 0 
    ? products.filter(p => p.platforms?.some(platform => selectedPlatforms.includes(platform)))
    : products;

  const renderProductList = () => {
    if (loading) {
      return <ProductSkeleton view={effectiveView} count={5} />;
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No launches during this month.</p>
          <Link to="/launches/today">
            <Button variant="outline">View Today's Launches</Button>
          </Link>
        </div>
      );
    }

    if (effectiveView === 'compact') {
      return (
        <div className="space-y-0">
          {filteredProducts.map((product, idx) => (
            <CompactLaunchListItem
              key={product.id}
              rank={idx + 1}
              name={product.name}
              votes={product.netVotes}
              slug={product.slug}
              userVote={product.userVote}
              onVote={() => handleVote(product.id)}
              launchDate={product.launch_date}
              commentCount={product.commentCount}
              makers={product.makers}
              domainUrl={product.domainUrl}
              categories={product.categories}
              platforms={product.platforms}
              verifiedMrr={product.verifiedMrr}
              mrrVerifiedAt={product.mrrVerifiedAt}
            />
          ))}
        </div>
      );
    }

    if (effectiveView === 'list') {
      return (
        <div className="space-y-2">
          {filteredProducts.map((product, idx) => (
            <LaunchListItem
              key={product.id}
              {...product}
              rank={idx + 1}
              onVote={handleVote}
            />
          ))}
        </div>
      );
    }

    // Grid view
    return (
      <div className="space-y-4">
        {filteredProducts.map((product, idx) => (
          <LaunchCard
            key={product.id}
            {...product}
            rank={idx + 1}
            onVote={handleVote}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle} | Launch</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://trylaunch.ai/launches/${year}/m${month}`} />
        <meta property="og:title" content={`${pageTitle} | Launch`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={`https://trylaunch.ai/launches/${year}/m${month}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${pageTitle} | Launch`} />
        <meta name="twitter:description" content={metaDescription} />
      </Helmet>
      
      <BreadcrumbSchema 
        items={[
          { name: 'Home', url: 'https://trylaunch.ai' },
          { name: 'Launches', url: 'https://trylaunch.ai/products' },
          { name: format(monthDate, 'MMMM yyyy'), url: `https://trylaunch.ai/launches/${year}/m${month}` }
        ]} 
      />

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Filter bar - matching homepage exactly */}
        <div className="flex flex-row items-center justify-between gap-2 mb-6">
          {/* Month Navigation on the left */}
          <div className="flex items-center gap-1 border rounded-md p-1 h-9">
            <Link to={formatMonthUrl(prevMonthDate)}>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">{format(prevMonthDate, 'MMM')}</span>
              </Button>
            </Link>
            {canGoNext && (
              <Link to={formatMonthUrl(nextMonthDate)}>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                  <span className="hidden sm:inline text-xs">{format(nextMonthDate, 'MMM')}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
          
          {/* Filters on the right */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
            <div className="hidden md:flex items-center relative w-32 h-9 border rounded-md bg-background">
              <Search className="absolute left-2 text-muted-foreground h-3.5 w-3.5" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="pl-7 h-full !text-[11px] sm:!text-xs border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <PlatformFilter selectedPlatforms={selectedPlatforms} onPlatformToggle={handlePlatformToggle} />
            <SortToggle sort={sort} onSortChange={handleSortChange} iconOnly={isMobile} showRevenue={true} />
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </div>

        {/* Title - matching homepage */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Reckless, serif' }}>
            {pageTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {format(monthStart, 'MMM d')} - {format(monthEnd, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Product list */}
        {renderProductList()}
        
        {/* Stats */}
        {!loading && filteredProducts.length > 0 && (
          <div className="text-center text-sm text-muted-foreground mt-8">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} launched in {format(monthDate, 'MMMM yyyy')}
          </div>
        )}
      </div>
    </div>
  );
};

export default LaunchArchiveMonthly;
