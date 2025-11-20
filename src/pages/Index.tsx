import { useState, useEffect } from 'react';
import { Lightbulb, Rocket, Sparkles, Zap, TrendingUp, Star, Heart, Code, Palette, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryCloud } from '@/components/CategoryCloud';
import { Newsletter } from '@/components/Newsletter';

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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-reckless font-bold mb-4 text-foreground">
            Today's Top Launches
          </h1>
          <p className="text-xl text-muted-foreground">
            Discover the best new products launching today
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4 mb-16">
          {launches.map((launch) => {
            const IconComponent = launch.icon;
            return (
              <div 
                key={launch.id} 
                className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-2xl font-bold text-muted-foreground w-8">
                    {launch.rank}
                  </span>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-reckless font-semibold text-lg text-foreground">
                      {launch.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{launch.tagline}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVote(launch.id)}
                  className="flex flex-col h-auto py-2 px-4 min-w-[70px]"
                >
                  <span className="text-xs text-muted-foreground">▲</span>
                  <span className="font-bold">{launch.votes}</span>
                </Button>
              </div>
            );
          })}
        </div>

        <CategoryCloud />
        <Newsletter />
      </div>
    </div>
  );
};

export default Index;
