import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Rocket, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, parse, isValid, addDays, subDays, isToday, isFuture } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CompactLaunchListItem } from '@/components/CompactLaunchListItem';
import { HomeLaunchListItem } from '@/components/HomeLaunchListItem';
import { HomeLaunchCard } from '@/components/HomeLaunchCard';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { PlatformFilter } from '@/components/PlatformFilter';
import { Platform } from '@/components/PlatformIcons';
import { BreadcrumbSchema } from '@/components/JsonLd';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Launch {
  id: string;
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  thumbnail?: string;
  slug: string;
  launch_date?: string;
  platforms?: Platform[];
  makers: Array<{ username: string; avatar_url?: string }>;
}

const LaunchArchive = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid' | 'compact'>(() => {
    const savedView = localStorage.getItem('archiveViewPreference');
    return (savedView === 'grid' || savedView === 'list' || savedView === 'compact') ? savedView : 'list';
  });
  const [sort, setSort] = useState<'rated' | 'popular' | 'latest' | 'revenue'>('popular');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  
  const effectiveView = isMobile ? 'compact' : view;

  // Handle "today" redirect and date parsing
  useEffect(() => {
    if (date === 'today') {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      navigate(`/launches/${todayStr}`, { replace: true });
      return;
    }
  }, [date, navigate]);

  // Parse the date from URL
  const parsedDate = date && date !== 'today' ? parse(date, 'yyyy-MM-dd', new Date()) : new Date();
  const isValidDate = isValid(parsedDate);
  const isFutureDate = isValidDate && isFuture(parsedDate) && !isToday(parsedDate);

  // Navigation dates
  const prevDate = isValidDate ? subDays(parsedDate, 1) : null;
  const nextDate = isValidDate ? addDays(parsedDate, 1) : null;
  const canGoNext = nextDate && (isToday(nextDate) || !isFuture(nextDate));

  useEffect(() => {
    localStorage.setItem('archiveViewPreference', view);
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
    if (date === 'today' || !isValidDate) return;
    fetchLaunches();
  }, [date, isValidDate]);

  useEffect(() => {
    if (launches.length === 0) return;
    
    const sorted = [...launches].sort((a, b) => {
      if (sort === 'popular') {
        return b.votes - a.votes;
      } else {
        return new Date(b.launch_date || 0).getTime() - new Date(a.launch_date || 0).getTime();
      }
    }).map((p, index) => ({ ...p, rank: index + 1 }));
    
    setLaunches(sorted);
  }, [sort]);

  const fetchLaunches = async () => {
    if (!isValidDate) return;
    
    setLoading(true);
    try {
      // Get start and end of the day in UTC
      const startOfDay = new Date(Date.UTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        0, 0, 0, 0
      ));
      const endOfDay = new Date(Date.UTC(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        23, 59, 59, 999
      ));

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          tagline,
          slug,
          launch_date,
          platforms,
          product_media(url, type),
          product_makers(
            users:user_id(username, avatar_url)
          )
        `)
        .eq('status', 'launched')
        .gte('launch_date', startOfDay.toISOString())
        .lte('launch_date', endOfDay.toISOString())
        .order('launch_date', { ascending: false });

      if (error) throw error;

      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');

      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      const launchData: Launch[] = (products || [])
        .map((p) => ({
          id: p.id,
          rank: 0,
          name: p.name,
          tagline: p.tagline,
          icon: Rocket,
          votes: voteMap.get(p.id) || 0,
          thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
          slug: p.slug,
          launch_date: p.launch_date,
          platforms: (p.platforms || []) as Platform[],
          makers: (p.product_makers || [])
            .map((pm: any) => pm.users)
            .filter((u: any) => u && u.username)
            .map((u: any) => ({ username: u.username, avatar_url: u.avatar_url }))
        }))
        .sort((a, b) => b.votes - a.votes)
        .map((p, index) => ({ ...p, rank: index + 1 }));

      setLaunches(launchData);
    } catch (error) {
      console.error('Error fetching launches:', error);
      toast.error('Failed to load launches');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (launchId: string) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    try {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('product_id', launchId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);
        
        setLaunches(prev => 
          prev.map(launch => 
            launch.id === launchId 
              ? { ...launch, votes: launch.votes - 1 }
              : launch
          )
        );
      } else {
        await supabase
          .from('votes')
          .insert({ product_id: launchId, user_id: user.id, value: 1 });
        
        setLaunches(prev => 
          prev.map(launch => 
            launch.id === launchId 
              ? { ...launch, votes: launch.votes + 1 }
              : launch
          )
        );
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  if (!isValidDate) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Date</h1>
          <p className="text-muted-foreground mb-6">The date format should be YYYY-MM-DD (e.g., 2025-01-15)</p>
          <Link to="/launches/today">
            <Button>View Today's Launches</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isFutureDate) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
          <h1 className="text-2xl font-bold mb-4">Future Date</h1>
          <p className="text-muted-foreground mb-6">Check back on {format(parsedDate, 'MMMM d, yyyy')} to see launches!</p>
          <Link to="/launches/today">
            <Button>View Today's Launches</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = format(parsedDate, 'MMMM d, yyyy');
  const shortDate = format(parsedDate, 'MMM d');
  const pageTitle = isToday(parsedDate) 
    ? "Today's Launches" 
    : `Launches on ${formattedDate}`;
  const metaDescription = `Discover the top product launches from ${formattedDate}. See what products launched, vote for your favorites, and explore the best new tools and apps.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle} | Launch</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://trylaunch.ai/launches/${date}`} />
        <meta property="og:title" content={`${pageTitle} | Launch`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={`https://trylaunch.ai/launches/${date}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${pageTitle} | Launch`} />
        <meta name="twitter:description" content={metaDescription} />
      </Helmet>
      
      <BreadcrumbSchema 
        items={[
          { name: 'Home', url: 'https://trylaunch.ai' },
          { name: 'Launches', url: 'https://trylaunch.ai/products' },
          { name: formattedDate, url: `https://trylaunch.ai/launches/${date}` }
        ]} 
      />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link to={`/launches/${format(prevDate!, 'yyyy-MM-dd')}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{format(prevDate!, 'MMM d')}</span>
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {isToday(parsedDate) ? "Today's Launches" : formattedDate}
            </h1>
          </div>

          {canGoNext ? (
            <Link to={`/launches/${format(nextDate!, 'yyyy-MM-dd')}`}>
              <Button variant="ghost" size="sm" className="gap-1">
                <span className="hidden sm:inline">{format(nextDate!, 'MMM d')}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <div className="w-20" /> // Spacer for alignment
          )}
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <PlatformFilter 
              selectedPlatforms={selectedPlatforms} 
              onPlatformToggle={(p) => setSelectedPlatforms(prev => 
                prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
              )} 
            />
            <SortToggle sort={sort} onSortChange={setSort} showRevenue={false} />
            {!isMobile && <ViewToggle view={view} onViewChange={setView} />}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading launches...</p>
          </div>
        ) : launches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No launches on this day.</p>
            <Link to="/launches/today">
              <Button variant="outline">View Today's Launches</Button>
            </Link>
          </div>
        ) : effectiveView === 'compact' ? (
          <div className="space-y-0 mb-8">
            {launches
              .filter(l => selectedPlatforms.length === 0 || l.platforms?.some(p => selectedPlatforms.includes(p)))
              .map((launch) => (
              <CompactLaunchListItem
                key={launch.id}
                rank={launch.rank}
                name={launch.name}
                votes={launch.votes}
                slug={launch.slug}
                platforms={launch.platforms}
                makers={launch.makers}
                launchDate={launch.launch_date}
                onVote={() => handleVote(launch.id)}
              />
            ))}
          </div>
        ) : effectiveView === 'list' ? (
          <div className="divide-y mb-8">
            {launches
              .filter(l => selectedPlatforms.length === 0 || l.platforms?.some(p => selectedPlatforms.includes(p)))
              .map((launch) => (
              <HomeLaunchListItem
                key={launch.id}
                rank={launch.rank}
                name={launch.name}
                tagline={launch.tagline}
                icon={launch.icon}
                votes={launch.votes}
                slug={launch.slug}
                launchDate={launch.launch_date}
                platforms={launch.platforms}
                makers={launch.makers}
                onVote={() => handleVote(launch.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {launches
                .filter(l => selectedPlatforms.length === 0 || l.platforms?.some(p => selectedPlatforms.includes(p)))
                .map((launch) => (
                <HomeLaunchCard
                  key={launch.id}
                  rank={launch.rank}
                  name={launch.name}
                  tagline={launch.tagline}
                  icon={launch.icon}
                  votes={launch.votes}
                  slug={launch.slug}
                  launchDate={launch.launch_date}
                  platforms={launch.platforms}
                  onVote={() => handleVote(launch.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {!loading && launches.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            {launches.length} product{launches.length !== 1 ? 's' : ''} launched on {formattedDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default LaunchArchive;
