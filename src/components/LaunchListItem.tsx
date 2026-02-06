import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageSquare, ExternalLink } from 'lucide-react';


import { useIsMobile } from '@/hooks/use-mobile';
import defaultProductIcon from '@/assets/default-product-icon.png';
import { VerifiedRevenueBadge } from '@/components/VerifiedRevenueBadge';
import { trackSponsorClick } from '@/hooks/use-sponsor-tracking';
import { formatTimeAgo } from '@/lib/formatTime';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';

// Truncate text to one sentence
const truncateToOneSentence = (text: string): string => {
  if (!text) return '';
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
};
interface LaunchListItemProps {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
  iconUrl?: string;
  domainUrl?: string;
  categories: string[];
  platforms?: Platform[];
  netVotes: number;
  userVote?: 1 | null;
  commentCount?: number;
  verifiedMrr?: number | null;
  mrrVerifiedAt?: string | null;
  launch_date?: string;
  makers: Array<{
    username: string;
    avatar_url?: string;
  }>;
  rank?: number;
  icon?: any;
  sponsored?: boolean;
  sponsoredPosition?: number;
  onVote: (productId: string) => void;
}

export const LaunchListItem = ({
  id,
  slug,
  name,
  tagline,
  thumbnail,
  iconUrl,
  domainUrl,
  categories,
  platforms,
  netVotes,
  userVote,
  commentCount = 0,
  verifiedMrr,
  mrrVerifiedAt,
  launch_date,
  makers,
  rank,
  icon: IconComponent,
  sponsored,
  sponsoredPosition,
  onVote,
}: LaunchListItemProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const handleVote = () => {
    onVote(id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (sponsored) {
      trackSponsorClick(id, sponsoredPosition);
    }
  };
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }
    if (sponsored) {
      trackSponsorClick(id, sponsoredPosition);
    }
    navigate(`/launch/${slug}`);
  };

  return (
    <div 
      className="group/card hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3 py-3 px-2">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 overflow-hidden bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            {iconUrl ? (
              <img 
                src={iconUrl} 
                alt={name} 
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = defaultProductIcon;
                }}
              />
            ) : IconComponent ? (
              <IconComponent className="w-6 h-6 text-primary" />
            ) : (
              <img 
                src={defaultProductIcon} 
                alt={name} 
                className="w-full h-full object-cover rounded-lg"
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {sponsored && (
              <Link 
                to="/advertise" 
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors"
              >
                Sponsored
              </Link>
            )}
            {rank && !sponsored && (
              <span className="text-sm font-bold text-muted-foreground">
                {rank}.
              </span>
            )}
            <h3 className="font-semibold text-base hover:text-primary transition-colors">
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
          
          <p className="text-sm text-muted-foreground mb-1.5 line-clamp-1">
            {truncateToOneSentence(tagline)}
          </p>
          
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {categories.slice(0, isMobile ? 1 : 3).map((category, index, arr) => (
              <span key={category}>
                <Link 
                  to={`/products?category=${encodeURIComponent(category)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary transition-colors"
                >
                  {category}
                </Link>
                {index < arr.length - 1 && ', '}
              </span>
            ))}
            
            {makers.length > 0 && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
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
              </>
            )}
            
            {platforms && platforms.length > 0 && (
              <>
                <span>·</span>
                <PlatformIcons platforms={platforms} size="sm" />
              </>
            )}
            
            {verifiedMrr !== null && verifiedMrr !== undefined && (
              <>
                <span>·</span>
                <VerifiedRevenueBadge verifiedMrr={verifiedMrr} mrrVerifiedAt={mrrVerifiedAt} />
              </>
            )}
            
            {/* Comment count inline - mobile only (desktop shows button) */}
            <span className="md:hidden">·</span>
            <div className="flex items-center gap-0.5 hover:text-primary transition-all hover:scale-105 md:hidden">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{commentCount}</span>
            </div>
            
            {launch_date && (
              <>
                <span>·</span>
                <span>{formatTimeAgo(launch_date)}</span>
              </>
            )}
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
              size="sm"
              variant="outline"
              className="group flex flex-col items-center justify-center gap-0.5 h-12 w-12 p-0 transition-colors touch-manipulation border-2 border-muted-foreground/20 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary"
            >
              <MessageSquare className="h-4 w-4 [@media(hover:hover)]:group-hover:text-primary-foreground" strokeWidth={2.5} />
              <span className="font-bold text-sm [@media(hover:hover)]:group-hover:text-primary-foreground">{commentCount}</span>
            </Button>
          </Link>
          
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleVote();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleVote();
            }}
            className="group flex flex-col items-center justify-center gap-0.5 h-12 w-12 p-0 transition-colors touch-manipulation active:scale-95 border-2 border-muted-foreground/20 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary"
          >
            <ArrowUp className={`h-4 w-4 [@media(hover:hover)]:group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`} strokeWidth={2.5} />
            <span className={`font-bold text-sm [@media(hover:hover)]:group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`}>{netVotes}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
