import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface HomeLaunchListItemProps {
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  slug: string;
  onVote: () => void;
}

export const HomeLaunchListItem = ({
  rank,
  name,
  tagline,
  icon: IconComponent,
  votes,
  slug,
  onVote,
}: HomeLaunchListItemProps) => {
  return (
    <Link to={`/launch/${slug}`} className="block">
      <div 
        className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer"
      >
      <div className="flex items-center gap-4 flex-1">
        <span className="text-2xl font-bold text-muted-foreground w-8">
          {rank}
        </span>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-reckless font-semibold text-lg text-foreground">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">{tagline}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          onVote();
        }}
        className="flex flex-col h-auto py-2 px-4 min-w-[70px]"
      >
        <span className="text-xs text-muted-foreground">▲</span>
        <span className="font-bold">{votes}</span>
      </Button>
      </div>
    </Link>
  );
};