import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageSquare, Star, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import defaultProductIcon from '@/assets/default-product-icon.png';
import { VerifiedRevenueBadge } from '@/components/VerifiedRevenueBadge';
import { trackSponsorClick } from '@/hooks/use-sponsor-tracking';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';

interface LaunchCardProps {
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
  makers: Array<{
    username: string;
    avatar_url?: string;
  }>;
  rank?: number;
  icon?: any;
  sponsored?: boolean;
  sponsoredPosition?: number;
  onVote: (productId: string) => void;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  onFollow?: (productId: string) => void;
}

export const LaunchCard = ({
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
  makers,
  rank,
  icon: IconComponent,
  sponsored,
  sponsoredPosition,
  onVote,
  showFollowButton = false,
  isFollowing = false,
  onFollow,
}: LaunchCardProps) => {
  const navigate = useNavigate();
  
  const handleVote = () => {
    onVote(id);
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFollow) {
      onFollow(id);
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
    <Card 
      className="group/card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {rank && !sponsored && (
        <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center">
          <span className="text-xs font-bold">{rank}</span>
        </div>
      )}
      <div className="aspect-video w-full overflow-hidden bg-white rounded-lg flex items-center justify-center">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={name} 
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = defaultProductIcon;
              e.currentTarget.className = "w-16 h-16 object-contain";
            }}
          />
        ) : iconUrl ? (
          <img 
            src={iconUrl} 
            alt={name} 
            className="w-16 h-16 object-contain"
            onError={(e) => {
              e.currentTarget.src = defaultProductIcon;
            }}
          />
        ) : IconComponent ? (
          <IconComponent className="w-16 h-16 text-primary" />
        ) : (
          <img 
            src={defaultProductIcon} 
            alt={name} 
            className="w-16 h-16 object-contain"
          />
        )}
      </div>
    
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-0.5">
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
        
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {tagline}
        </p>
        
        {showFollowButton && (
          <Button
            size="sm"
            variant={isFollowing ? 'outline' : 'secondary'}
            onClick={handleFollow}
            className="w-full mb-3"
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
        
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {categories.slice(0, 3).map((category) => (
            <Link 
              key={category}
              to={`/products?category=${encodeURIComponent(category)}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                {category}
              </Badge>
            </Link>
          ))}
          <PlatformIcons platforms={platforms} size="sm" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
            <div className="flex -space-x-2">
              {makers.filter(m => m && m.username).slice(0, 3).map((maker) => (
                <Link 
                  key={maker.username}
                  to={`/@${maker.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:z-10"
                >
                  <Avatar className="h-6 w-6 border-2 border-background hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={maker.avatar_url} alt={maker.username} />
                    <AvatarFallback className="text-xs">{maker.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-all hover:scale-105">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">{commentCount}</span>
            </div>
            
            <VerifiedRevenueBadge verifiedMrr={verifiedMrr} mrrVerifiedAt={mrrVerifiedAt} />
          </div>
        </div>
      </div>
    </Card>
  );
};
