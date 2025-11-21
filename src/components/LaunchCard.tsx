import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LaunchCardProps {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  thumbnail: string;
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
}

export const LaunchCard = ({
  id,
  slug,
  name,
  tagline,
  thumbnail,
  categories,
  netVotes,
  userVote,
  commentCount = 0,
  makers,
  rank,
  icon: IconComponent,
  onVote,
}: LaunchCardProps) => {
  const handleVote = () => {
    onVote(id);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link to={`/launch/${slug}`} className="block relative">
        {rank && (
          <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center">
            <span className="text-sm font-bold">{rank}</span>
          </div>
        )}
        <div className="aspect-video w-full overflow-hidden bg-primary/10 flex items-center justify-center">
          {thumbnail ? (
            <img 
              src={thumbnail} 
              alt={name} 
              className="w-full h-full object-cover"
            />
          ) : IconComponent ? (
            <IconComponent className="w-16 h-16 text-primary" />
          ) : null}
        </div>
      </Link>
      
      <div className="p-4">
        <Link to={`/launch/${slug}`}>
          <h3 className="font-semibold text-lg mb-1 hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>
        
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {tagline}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
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
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={userVote === 1 ? 'default' : 'outline'}
                onClick={(e) => {
                  e.preventDefault();
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
            <Link to={`/launch/${slug}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-all hover:scale-105">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">{commentCount}</span>
            </Link>
          </div>
          
          <div className="flex -space-x-2">
            {makers.slice(0, 3).map((maker) => (
              <Avatar key={maker.username} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={maker.avatar_url} alt={maker.username} />
                <AvatarFallback>{maker.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
