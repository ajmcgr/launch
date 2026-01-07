import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { trackSponsorClick } from '@/hooks/use-sponsor-tracking';

interface HomeMinimalListItemProps {
  rank: number;
  name: string;
  tagline: string;
  votes: number;
  slug: string;
  domainUrl?: string;
  launchDate?: string;
  userVote?: boolean;
  sponsored?: boolean;
  sponsoredPosition?: number;
  productId?: string;
  onVote: () => void;
}

export const HomeMinimalListItem = ({
  rank,
  name,
  tagline,
  votes,
  slug,
  launchDate,
  sponsored,
  sponsoredPosition,
  productId,
  onVote,
}: HomeMinimalListItemProps) => {
  const handleClick = () => {
    if (sponsored && productId) {
      trackSponsorClick(productId, sponsoredPosition);
    }
  };

  return (
    <div className="group/card hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-2 py-3 px-2">
        {!sponsored && (
          <span className="text-sm font-medium text-muted-foreground w-6 text-right shrink-0">
            {rank}.
          </span>
        )}
        {sponsored && (
          <Link 
            to="/advertise" 
            className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors shrink-0"
          >
            Ad
          </Link>
        )}
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVote();
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
    </div>
  );
};
