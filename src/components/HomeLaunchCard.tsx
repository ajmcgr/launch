import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { formatTimeAgo } from '@/lib/formatTime';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';

interface HomeLaunchCardProps {
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  slug: string;
  domainUrl?: string;
  launchDate?: string;
  platforms?: Platform[];
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
  launchDate,
  platforms,
  userVote,
  onVote,
}: HomeLaunchCardProps) => {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }
    navigate(`/launch/${slug}`);
  };

  return (
    <Card 
      className="group/card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
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
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVote();
            }}
            className={`group flex flex-col items-center justify-center gap-0.5 h-14 w-14 p-0 touch-manipulation active:scale-95 border-2 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary transition-colors ${userVote === 1 ? 'border-primary bg-primary/10' : 'border-muted-foreground/20'}`}
          >
            <span className={`text-sm font-bold [@media(hover:hover)]:group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`}>▲</span>
            <span className={`font-bold text-sm [@media(hover:hover)]:group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`}>{votes}</span>
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
        {(launchDate || (platforms && platforms.length > 0)) && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
            {launchDate && <span>{formatTimeAgo(launchDate)}</span>}
            <PlatformIcons platforms={platforms} size="sm" />
          </div>
        )}
      </div>
    </Card>
  );
};