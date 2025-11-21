import { useState, useEffect } from 'react';
import { Rocket } from 'lucide-react';
import { CategoryCloud } from '@/components/CategoryCloud';
import { ViewToggle } from '@/components/ViewToggle';
import { HomeLaunchListItem } from '@/components/HomeLaunchListItem';
import { HomeLaunchCard } from '@/components/HomeLaunchCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Launch {
  id: string;
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  thumbnail?: string;
  slug: string;
}

const Index = () => {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => {
    const savedView = localStorage.getItem('homeViewPreference');
    return (savedView === 'grid' || savedView === 'list') ? savedView : 'list';
  });

  useEffect(() => {
    localStorage.setItem('homeViewPreference', view);
  }, [view]);

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
          product_media(url, type)
        `)
        .eq('status', 'published')
        .gte('launch_date', today.toISOString())
        .order('launch_date', { ascending: false });

      if (error) throw error;

      const { data: voteCounts } = await supabase
        .from('product_vote_counts')
        .select('product_id, net_votes');

      const voteMap = new Map(voteCounts?.map(v => [v.product_id, v.net_votes || 0]) || []);

      const launches: Launch[] = (products || [])
        .map((p, index) => ({
          id: p.id,
          rank: index + 1,
          name: p.name,
          tagline: p.tagline,
          icon: Rocket,
          votes: voteMap.get(p.id) || 0,
          thumbnail: p.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
          slug: p.slug
        }))
        .sort((a, b) => b.votes - a.votes)
        .map((p, index) => ({ ...p, rank: index + 1 }));

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
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl md:text-5xl font-reckless font-bold mb-4 text-foreground">
              Today's Top Launches
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover the best new products launching today
            </p>
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading launches...</p>
          </div>
        ) : launches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No launches today. Check back soon!</p>
          </div>
        ) : view === 'list' ? (
          <div className="space-y-4 mb-16">
            {launches.map((launch) => (
              <HomeLaunchListItem
                key={launch.id}
                rank={launch.rank}
                name={launch.name}
                tagline={launch.tagline}
                icon={launch.icon}
                votes={launch.votes}
                slug={launch.slug}
                onVote={() => handleVote(launch.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {launches.map((launch) => (
              <HomeLaunchCard
                key={launch.id}
                rank={launch.rank}
                name={launch.name}
                tagline={launch.tagline}
                icon={launch.icon}
                votes={launch.votes}
                slug={launch.slug}
                onVote={() => handleVote(launch.id)}
              />
            ))}
          </div>
        )}

        <CategoryCloud />
      </div>
    </div>
  );
};

export default Index;
