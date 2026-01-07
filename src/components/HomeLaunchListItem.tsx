import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HomeLaunchListItemProps {
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  slug: string;
  domainUrl?: string;
  launchDate?: string;
  userVote?: 1 | null;
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
  userVote,
  onVote,
}: HomeLaunchListItemProps) => {
  return (
    <Link to={`/launch/${slug}`} className="block">
      <div 
        className="group/card flex items-center gap-3 py-3 px-2 hover:bg-muted/30 transition-colors cursor-pointer"
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
            {launchDate && (
              <span className="text-xs text-muted-foreground">
                · {formatDistanceToNow(new Date(launchDate), { addSuffix: true })}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{tagline}</p>
        </div>
      </div>
      <div className="flex items-start self-start">
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
    </Link>
  );
};