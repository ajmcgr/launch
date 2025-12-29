import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface HomeLaunchCardProps {
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  slug: string;
  domainUrl?: string;
  userVote?: 1 | null;
  onVote: () => void;
}

export const HomeLaunchCard = ({
  rank,
  name,
  tagline,
  icon: IconComponent,
  votes,
  slug,
  domainUrl,
  userVote,
  onVote,
}: HomeLaunchCardProps) => {
  return (
    <Link to={`/launch/${slug}`} className="block">
      <Card className="group/card overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-xl font-bold text-muted-foreground">
            #{rank}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVote();
            }}
            className={`group flex flex-col items-center gap-0 h-auto py-1 px-3 min-w-[50px] touch-manipulation active:scale-95 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary transition-all [@media(hover:hover)]:hover:scale-105 ${userVote === 1 ? 'border-primary' : ''}`}
          >
            <span className="text-xs [@media(hover:hover)]:group-hover:text-primary-foreground">▲</span>
            <span className="font-semibold text-sm [@media(hover:hover)]:group-hover:text-primary-foreground">{votes}</span>
          </Button>
        </div>
        
        <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center mb-4 mx-auto">
          <IconComponent className="w-8 h-8 text-primary" />
        </div>
        
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <h3 className="font-reckless font-semibold text-lg text-foreground text-center">
            {name}
          </h3>
          {domainUrl && (
            <a
              href={domainUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/card:opacity-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground text-center line-clamp-2">
          {tagline}
        </p>
      </div>
      </Card>
    </Link>
  );
};