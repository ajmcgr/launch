import { useState, useEffect } from 'react';
import { Rocket, Clock } from 'lucide-react';
import { CategoryCloud } from '@/components/CategoryCloud';
import { ViewToggle } from '@/components/ViewToggle';
import { SortToggle } from '@/components/SortToggle';
import { HomeLaunchListItem } from '@/components/HomeLaunchListItem';
import { CompactLaunchListItem } from '@/components/CompactLaunchListItem';
import { HomeLaunchCard } from '@/components/HomeLaunchCard';
import { PlatformFilter } from '@/components/PlatformFilter';
import { Platform } from '@/components/PlatformIcons';
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

const Index = () => {
  const isMobile = useIsMobile();
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid' | 'compact'>(() => {
    const savedView = localStorage.getItem('homeViewPreference');
    return (savedView === 'grid' || savedView === 'list' || savedView === 'compact') ? savedView : 'list';
  });
  const [sort, setSort] = useState<'rated' | 'popular' | 'latest' | 'revenue'>('popular');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [displayCount, setDisplayCount] = useState(25);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Force list view on mobile
  const effectiveView = isMobile ? 'compact' : view;

  useEffect(() => {
    localStorage.setItem('homeViewPreference', view);
  }, [view]);

  useEffect(() => {
    // LAUNCH20 promo - 20% off, runs until March 30, 2025
    const targetDate = new Date('2025-03-30T23:59:59').getTime();
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      
      if (distance < 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchLaunches();

    return () => subscription.unsubscribe();
  }, []);

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
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

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
        .gte('launch_date', today.toISOString())
        .order('launch_date', { ascending: false });

      if (error) throw error;

      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');

      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      let launches: Launch[] = (products || [])
        .map((p, index) => ({
          id: p.id,
          rank: index + 1,
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
        }));

      setLaunches(launches);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {(countdown.days > 0 || countdown.hours > 0 || countdown.minutes > 0 || countdown.seconds > 0) && (
          <div className="mb-8 p-6 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-primary" />
              <p className="text-lg font-semibold text-foreground">
                Save 20% on paid launches. Use code <span className="text-primary">LAUNCH20</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 text-center">
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-primary">{countdown.days}</span>
                <span className="text-sm text-muted-foreground">days</span>
              </div>
              <span className="text-2xl text-muted-foreground">:</span>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-primary">{countdown.hours}</span>
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
              <span className="text-2xl text-muted-foreground">:</span>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-primary">{countdown.minutes}</span>
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <span className="text-2xl text-muted-foreground">:</span>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-primary">{countdown.seconds}</span>
                <span className="text-sm text-muted-foreground">sec</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-reckless font-bold mb-4 text-foreground">
            Today's Top Launches
          </h1>
          <p className="text-xl text-muted-foreground">
            The launchpad for indie makers to share, vote, and discover the next big thing
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Today's Top Launches</h2>
            <div className="flex items-center gap-2">
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
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading launches...</p>
          </div>
        ) : launches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No launches today. Check back soon!</p>
          </div>
        ) : effectiveView === 'compact' ? (
          <div className="space-y-0 mb-8">
            {launches
              .filter(l => selectedPlatforms.length === 0 || l.platforms?.some(p => selectedPlatforms.includes(p)))
              .slice(0, displayCount).map((launch) => (
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
              .slice(0, displayCount).map((launch) => (
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
                .slice(0, displayCount).map((launch) => (
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

        {launches.length > displayCount && (
          <div className="flex justify-center mb-16">
            <button
              onClick={() => setDisplayCount(prev => prev + 25)}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              Load More
            </button>
          </div>
        )}

        <CategoryCloud />
      </div>
    </div>
  );
};

export default Index;
