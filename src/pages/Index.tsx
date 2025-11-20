import { useState, useEffect } from 'react';
import { Lightbulb, Rocket, Sparkles, Zap, TrendingUp, Star, Heart, Code, Palette, Music } from 'lucide-react';
import { CategoryCloud } from '@/components/CategoryCloud';
import { Newsletter } from '@/components/Newsletter';
import { ViewToggle } from '@/components/ViewToggle';
import { HomeLaunchListItem } from '@/components/HomeLaunchListItem';
import { HomeLaunchCard } from '@/components/HomeLaunchCard';

interface Launch {
  id: number;
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
}

const mockLaunches: Launch[] = [
  { id: 1, rank: 1, name: 'AI Content Studio', tagline: 'Create stunning content with AI', icon: Sparkles, votes: 324 },
  { id: 2, rank: 2, name: 'CodeMate Pro', tagline: 'Your AI pair programmer', icon: Code, votes: 298 },
  { id: 3, rank: 3, name: 'DesignFlow', tagline: 'Design systems made simple', icon: Palette, votes: 276 },
  { id: 4, rank: 4, name: 'RocketLaunch', tagline: 'Ship products faster', icon: Rocket, votes: 251 },
  { id: 5, rank: 5, name: 'TrendTracker', tagline: 'Stay ahead of the curve', icon: TrendingUp, votes: 234 },
  { id: 6, rank: 6, name: 'StarBoard', tagline: 'Project management reimagined', icon: Star, votes: 212 },
  { id: 7, rank: 7, name: 'HeartBeat Analytics', tagline: 'Know your customers deeply', icon: Heart, votes: 198 },
  { id: 8, rank: 8, name: 'ZapAutomation', tagline: 'Automate everything', icon: Zap, votes: 187 },
  { id: 9, rank: 9, name: 'SoundWave Studio', tagline: 'Professional audio editing', icon: Music, votes: 176 },
  { id: 10, rank: 10, name: 'IdeaVault', tagline: 'Never lose an idea again', icon: Lightbulb, votes: 165 },
];

const Index = () => {
  const [launches, setLaunches] = useState<Launch[]>(mockLaunches);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => {
    const savedView = localStorage.getItem('homeViewPreference');
    return (savedView === 'grid' || savedView === 'list') ? savedView : 'list';
  });

  useEffect(() => {
    localStorage.setItem('homeViewPreference', view);
  }, [view]);

  const handleVote = (launchId: number) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    
    setLaunches(prev => 
      prev.map(launch => 
        launch.id === launchId 
          ? { ...launch, votes: launch.votes + 1 }
          : launch
      )
    );
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

        {view === 'list' ? (
          <div className="space-y-4 mb-16">
            {launches.map((launch) => (
              <HomeLaunchListItem
                key={launch.id}
                rank={launch.rank}
                name={launch.name}
                tagline={launch.tagline}
                icon={launch.icon}
                votes={launch.votes}
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
                onVote={() => handleVote(launch.id)}
              />
            ))}
          </div>
        )}

        <CategoryCloud />
        <Newsletter />
      </div>
    </div>
  );
};

export default Index;
