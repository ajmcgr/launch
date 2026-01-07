import { Link } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';

interface CompactLaunchListItemProps {
  rank: number;
  name: string;
  votes: number;
  slug: string;
  userVote?: 1 | null;
  onVote: () => void;
}

export const CompactLaunchListItem = ({
  rank,
  name,
  votes,
  slug,
  userVote,
  onVote,
}: CompactLaunchListItemProps) => {
  return (
    <Link to={`/launch/${slug}`} className="block">
      <div className="group/card flex items-center gap-2 py-2 px-2 hover:bg-muted/30 transition-colors cursor-pointer">
        <span className="text-sm font-bold text-muted-foreground w-6 text-right">
          {rank}.
        </span>
        <h3 className="font-medium text-sm text-foreground flex-1 truncate">
          {name}
        </h3>
        <button
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
          className={`flex items-center gap-1 text-sm touch-manipulation active:scale-95 transition-colors ${
            userVote === 1 ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <ChevronUp className="h-4 w-4" />
          <span className="font-medium">{votes}</span>
        </button>
      </div>
    </Link>
  );
};
