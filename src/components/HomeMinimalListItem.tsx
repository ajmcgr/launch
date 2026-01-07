import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface HomeMinimalListItemProps {
  rank: number;
  name: string;
  tagline: string;
  votes: number;
  slug: string;
  domainUrl?: string;
  launchDate?: string;
  userVote?: boolean;
  onVote: () => void;
}

export const HomeMinimalListItem = ({
  rank,
  name,
  tagline,
  votes,
  slug,
  launchDate,
  onVote,
}: HomeMinimalListItemProps) => {
  return (
    <div className="flex items-start gap-1 py-1 text-sm font-mono">
      <span className="text-muted-foreground w-6 text-right shrink-0">{rank}.</span>
      
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote();
        }}
        className="text-muted-foreground hover:text-primary transition-colors shrink-0 px-0.5"
        aria-label="Upvote"
      >
        ▲
      </button>
      
      <div className="flex flex-col min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <Link 
            to={`/launch/${slug}`} 
            className="text-foreground hover:underline font-medium truncate"
          >
            {name}
          </Link>
          <span className="text-muted-foreground text-xs truncate">
            {tagline}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{votes} point{votes !== 1 ? 's' : ''}</span>
          {launchDate && (
            <>
              <span>|</span>
              <span>{formatDistanceToNow(new Date(launchDate), { addSuffix: true })}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
