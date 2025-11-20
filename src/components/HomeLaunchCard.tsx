import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface HomeLaunchCardProps {
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  onVote: () => void;
}

export const HomeLaunchCard = ({
  rank,
  name,
  tagline,
  icon: IconComponent,
  votes,
  onVote,
}: HomeLaunchCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-xl font-bold text-muted-foreground">
            #{rank}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onVote}
            className="flex flex-col h-auto py-2 px-4"
          >
            <span className="text-xs text-muted-foreground">▲</span>
            <span className="font-bold">{votes}</span>
          </Button>
        </div>
        
        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4 mx-auto">
          <IconComponent className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="font-reckless font-semibold text-lg text-foreground text-center mb-2">
          {name}
        </h3>
        <p className="text-sm text-muted-foreground text-center line-clamp-2">
          {tagline}
        </p>
      </div>
    </Card>
  );
};