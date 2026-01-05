import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageSquare, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import defaultProductIcon from '@/assets/default-product-icon.png';
import { VerifiedRevenueBadge } from '@/components/VerifiedRevenueBadge';
import { trackSponsorClick } from '@/hooks/use-sponsor-tracking';
interface LaunchListItemProps {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
  iconUrl?: string;
  domainUrl?: string;
  categories: string[];
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
  return (
    <div className="group/card hover:bg-muted/30 transition-colors">
      <Link to={`/launch/${slug}`} className="block" onClick={handleClick}>
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
              {tagline}
            </p>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, isMobile ? 1 : 3).map((category) => (
                  <span
                    key={category}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Link 
                      to={`/products?category=${encodeURIComponent(category)}`}
                    >
                      <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                        {category}
                      </Badge>
                    </Link>
                  </span>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {makers.slice(0, 3).map((maker) => (
                    <span
                      key={maker.username}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Link 
                        to={`/@${maker.username}`}
                        className="hover:z-10"
                      >
                        <Avatar className="h-5 w-5 border-2 border-background hover:ring-2 hover:ring-primary transition-all">
                          <AvatarImage src={maker.avatar_url} alt={maker.username} />
                          <AvatarFallback className="text-[10px]">{maker.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </Link>
                    </span>
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

          <div className="flex items-start self-start">
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
              className={`group flex flex-col items-center gap-0.5 h-auto py-1.5 px-3 min-w-[48px] transition-colors touch-manipulation active:scale-95 border-2 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary ${userVote === 1 ? 'border-primary bg-primary/10' : 'border-muted-foreground/20'}`}
            >
              <ArrowUp className={`h-4 w-4 [@media(hover:hover)]:group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`} strokeWidth={2.5} />
              <span className={`font-bold text-sm [@media(hover:hover)]:group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`}>{netVotes}</span>
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
};
