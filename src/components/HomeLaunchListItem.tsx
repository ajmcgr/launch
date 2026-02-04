import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageSquare } from 'lucide-react';

import { formatTimeAgo } from '@/lib/formatTime';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';

interface HomeLaunchListItemProps {
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  slug: string;
  domainUrl?: string;
  launchDate?: string;
  platforms?: Platform[];
  makers?: Array<{ username: string; avatar_url?: string }>;
  userVote?: 1 | null;
  commentCount?: number;
  onVote: () => void;
}

export const HomeLaunchListItem = ({
  rank,
  name,
  tagline,
  icon: IconComponent,
  votes,
  slug,
  domainUrl,
  launchDate,
  platforms,
  makers = [],
  userVote,
  commentCount = 0,
  onVote,
}: HomeLaunchListItemProps) => {
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
    <div 
      className="group/card flex items-center gap-3 py-3 px-2 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
          <IconComponent className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-muted-foreground">
              {rank}.
            </span>
            <h3 className="font-semibold text-base text-foreground">
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
            {platforms && platforms.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <PlatformIcons platforms={platforms} size="sm" />
              </>
            )}
            {launchDate && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{formatTimeAgo(launchDate)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground line-clamp-1 flex-1">{tagline}</p>
            {makers.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {makers.filter(m => m && m.username).slice(0, 2).map((maker, index, arr) => (
                  <span key={maker.username} className="text-xs text-muted-foreground">
                    <Link 
                      to={`/@${maker.username}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-primary transition-colors"
                    >
                      @{maker.username}
                    </Link>
                    {index < arr.length - 1 && ','}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-start self-start gap-3">
        {/* Comment button - desktop only */}
        <Link
          to={`/launch/${slug}#comments`}
          onClick={(e) => e.stopPropagation()}
          className="hidden md:flex"
        >
          <Button
            variant="outline"
            size="sm"
            className="group flex flex-col items-center justify-center gap-0.5 h-12 w-12 p-0 touch-manipulation border-2 border-muted-foreground/20 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary transition-colors"
          >
            <MessageSquare className="h-4 w-4 [@media(hover:hover)]:group-hover:text-primary-foreground" strokeWidth={2.5} />
            <span className="font-bold text-sm [@media(hover:hover)]:group-hover:text-primary-foreground">{commentCount}</span>
          </Button>
        </Link>
        
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
          className="group flex flex-col items-center justify-center gap-0.5 h-12 w-12 p-0 touch-manipulation active:scale-95 border-2 border-muted-foreground/20 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary transition-colors"
        >
          <span className={`text-sm font-bold [@media(hover:hover)]:group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`}>▲</span>
          <span className={`font-bold text-sm [@media(hover:hover)]:group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`}>{votes}</span>
        </Button>
      </div>
    </div>
  );
};