import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageSquare, Star, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import defaultProductIcon from '@/assets/default-product-icon.png';

interface LaunchCardProps {
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
  makers: Array<{
    username: string;
    avatar_url?: string;
  }>;
  rank?: number;
  icon?: any;
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
  netVotes,
  userVote,
  commentCount = 0,
  makers,
  rank,
  icon: IconComponent,
  onVote,
  showFollowButton = false,
  isFollowing = false,
  onFollow,
}: LaunchCardProps) => {
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

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/launch/${slug}`} className="block">
        {rank && (
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
                className="text-muted-foreground hover:text-primary transition-colors"
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
            <Star className={`h-3 w-3 mr-1 ${isFollowing ? 'fill-current' : ''}`} />
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
        
        <div className="flex flex-wrap gap-1.5 mb-2">
          {categories.slice(0, 3).map((category) => (
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
              className={`group flex flex-col items-center gap-0 h-auto py-1 px-3 min-w-[50px] hover:border-primary hover:bg-primary transition-all hover:scale-105 ${userVote === 1 ? 'border-primary' : ''}`}
            >
              <ArrowUp className={`h-4 w-4 group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`} />
              <span className="font-semibold text-sm group-hover:text-primary-foreground">{netVotes}</span>
            </Button>
            <div className="flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-all hover:scale-105">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">{commentCount}</span>
            </div>
          </div>
          
          <div className="flex -space-x-2">
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
                  <Avatar className="h-6 w-6 border-2 border-background hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={maker.avatar_url} alt={maker.username} />
                    <AvatarFallback className="text-xs">{maker.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>
      </Link>
    </Card>
  );
};
