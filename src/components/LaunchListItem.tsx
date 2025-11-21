import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LaunchListItemProps {
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
  onVote: (productId: string) => void;
}

export const LaunchListItem = ({
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
  onVote,
}: LaunchListItemProps) => {
  const handleVote = () => {
    onVote(id);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-4 p-4">
        <Link to={`/launch/${slug}`} className="block flex-shrink-0">
          <div className="w-32 h-24 overflow-hidden bg-muted rounded-md">
            <img 
              src={thumbnail} 
              alt={name} 
              className="w-full h-full object-cover"
            />
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link to={`/launch/${slug}`}>
            <h3 className="font-semibold text-lg mb-1 hover:text-primary transition-colors">
              {name}
            </h3>
          </Link>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {tagline}
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
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
            
            <div className="flex items-center gap-3">
              <Link to={`/launch/${slug}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">{commentCount}</span>
              </Link>
              
              <div className="flex -space-x-2">
                {makers.slice(0, 3).map((maker) => (
                  <Avatar key={maker.username} className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={maker.avatar_url} alt={maker.username} />
                    <AvatarFallback>{maker.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 pt-1">
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
          <span className="font-semibold text-base min-w-[2.5rem] text-center">
            {netVotes}
          </span>
        </div>
      </div>
    </Card>
  );
};
