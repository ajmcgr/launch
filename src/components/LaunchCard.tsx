import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageSquare, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LaunchCardProps {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
  iconUrl?: string;
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
        <div className="aspect-video w-full overflow-hidden bg-primary/10 rounded-lg flex items-center justify-center">
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt={name} 
              className="w-full h-full object-cover rounded-lg"
            />
          ) : iconUrl ? (
            <img 
              src={iconUrl} 
              alt={name} 
              className="w-16 h-16 object-contain"
            />
          ) : IconComponent ? (
            <IconComponent className="w-16 h-16 text-primary" />
          ) : null}
        </div>
      
      <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 hover:text-primary transition-colors">
            {name}
          </h3>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
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
        
        <div className="flex flex-wrap gap-2 mb-3">
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={userVote === 1 ? 'default' : 'outline'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleVote();
                }}
                className="h-12 w-12 p-0 !hover:bg-transparent hover:text-white hover:border-primary transition-all hover:scale-105"
              >
                <ArrowUp className="h-6 w-6" />
              </Button>
              <span className="font-semibold text-lg min-w-[2.5rem] text-center">
                {netVotes}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-all hover:scale-105">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">{commentCount}</span>
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
                  <Avatar className="h-8 w-8 border-2 border-background hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={maker.avatar_url} alt={maker.username} />
                    <AvatarFallback>{maker.username[0].toUpperCase()}</AvatarFallback>
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
