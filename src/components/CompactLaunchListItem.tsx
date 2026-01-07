import { Link } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CompactLaunchListItemProps {
  rank: number;
  name: string;
  votes: number;
  slug: string;
  userVote?: 1 | null;
  onVote: () => void;
  launchDate?: string;
  commentCount?: number;
  makers?: Array<{ username: string; avatar_url?: string }>;
}

export const CompactLaunchListItem = ({
  rank,
  name,
  votes,
  slug,
  userVote,
  onVote,
  launchDate,
  commentCount = 0,
  makers = [],
}: CompactLaunchListItemProps) => {
  const firstMaker = makers[0];
  
  const metaParts: string[] = [];
  if (firstMaker) metaParts.push(firstMaker.username);
  if (launchDate) metaParts.push(formatDistanceToNow(new Date(launchDate), { addSuffix: true }));
  if (commentCount > 0) metaParts.push(`${commentCount} comment${commentCount !== 1 ? 's' : ''}`);
  
  return (
    <Link to={`/launch/${slug}`} className="block">
      <div className="group/card flex items-start gap-2 py-1.5 px-2 hover:bg-muted/30 transition-colors cursor-pointer">
        <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0 pt-0.5">
          {rank}.
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">
            {name}
          </h3>
          {metaParts.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              {metaParts.join(' · ')}
            </p>
          )}
        </div>
        
        {/* Vote button */}
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
          className={`flex items-center gap-0.5 text-sm touch-manipulation active:scale-95 transition-colors flex-shrink-0 pt-0.5 ${
            userVote === 1 ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <ChevronUp className="h-4 w-4" />
          <span className="font-medium text-xs">{votes}</span>
        </button>
      </div>
    </Link>
  );
};
