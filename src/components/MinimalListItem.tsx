import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { trackSponsorClick } from '@/hooks/use-sponsor-tracking';

interface MinimalListItemProps {
  id: string;
  name: string;
  tagline: string;
  slug: string;
  netVotes: number;
  launch_date?: string;
  sponsored?: boolean;
  sponsoredPosition?: number;
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
  sponsoredPosition,
  rank,
  onVote,
}: MinimalListItemProps) => {
  const handleClick = () => {
    if (sponsored) {
      trackSponsorClick(id, sponsoredPosition);
    }
  };

  return (
    <div className="group/card hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-2 py-3 px-2">
        {!sponsored && rank && (
          <span className="text-sm font-medium text-muted-foreground w-6 text-right shrink-0">
            {rank}.
          </span>
        )}
        {sponsored && (
          <Link 
            to="/advertise" 
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors shrink-0"
          >
            Ad
          </Link>
        )}
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVote(id);
          }}
          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
          aria-label="Upvote"
        >
          ▲
        </button>
        
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link 
              to={`/launch/${slug}`} 
              onClick={handleClick}
              className="text-foreground hover:text-primary font-semibold text-base transition-colors"
            >
              {name}
            </Link>
            <span className="text-sm text-muted-foreground line-clamp-1">
              {tagline}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
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
    </div>
  );
};
