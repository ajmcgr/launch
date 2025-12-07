import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, MessageSquare, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import defaultProductIcon from '@/assets/default-product-icon.png';

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
  makers: Array<{
    username: string;
    avatar_url?: string;
  }>;
  rank?: number;
  icon?: any;
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
  makers,
  rank,
  icon: IconComponent,
  onVote,
}: LaunchListItemProps) => {
  const isMobile = useIsMobile();
  const handleVote = () => {
    onVote(id);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow min-h-[110px]">
      <Link to={`/launch/${slug}`} className="block">
        <div className="flex gap-3 p-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 overflow-hidden bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              {iconUrl ? (
                <img 
                  src={iconUrl} 
                  alt={name} 
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : IconComponent ? (
                <IconComponent className="w-8 h-8 text-primary" />
              ) : (
                <img 
                  src={defaultProductIcon} 
                  alt={name} 
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
            </div>
          </div>
          {rank && (
            <div className="flex items-start justify-center text-base font-bold text-foreground w-6 flex-shrink-0 -mr-1 leading-[1.5]">
              {rank}.
            </div>
          )}

          <div className="flex-1 min-w-0">
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
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
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
                <div className="flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-all hover:scale-105">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="text-xs">{commentCount}</span>
                </div>
                
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
              className={`group flex flex-col items-center gap-0 h-auto py-1 px-3 min-w-[50px] hover:border-primary hover:bg-primary transition-all hover:scale-105 ${userVote === 1 ? 'border-primary' : ''}`}
            >
              <ArrowUp className={`h-4 w-4 group-hover:text-primary-foreground ${userVote === 1 ? 'text-primary' : ''}`} />
              <span className="font-semibold text-sm group-hover:text-primary-foreground">{netVotes}</span>
            </Button>
          </div>
        </div>
      </Link>
    </Card>
  );
};
