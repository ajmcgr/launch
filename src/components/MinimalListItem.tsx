import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface MinimalListItemProps {
  id: string;
  name: string;
  tagline: string;
  slug: string;
  netVotes: number;
  launch_date?: string;
  sponsored?: boolean;
  rank?: number;
  onVote: (productId: string) => void;
}

export const MinimalListItem = ({
  id,
  name,
  tagline,
  slug,
  netVotes,
  launch_date,
  sponsored,
  rank,
  onVote,
}: MinimalListItemProps) => {
  return (
    <div className="flex items-start gap-1 py-1 text-sm font-mono">
      {rank && (
        <span className="text-muted-foreground w-6 text-right shrink-0">{rank}.</span>
      )}
      {sponsored && (
        <span className="text-xs text-primary/60 shrink-0">▶</span>
      )}
      
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote(id);
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
          {sponsored && (
            <span className="text-xs text-primary/60">(ad)</span>
          )}
          <span className="text-muted-foreground text-xs truncate">
            {tagline}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{netVotes} point{netVotes !== 1 ? 's' : ''}</span>
          {launch_date && (
            <>
              <span>|</span>
              <span>{formatDistanceToNow(new Date(launch_date), { addSuffix: true })}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
