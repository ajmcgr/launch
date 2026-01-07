import { Link } from 'react-router-dom';
import { ChevronUp, ExternalLink } from 'lucide-react';
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
  domainUrl?: string;
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
  domainUrl,
}: CompactLaunchListItemProps) => {
  const firstMaker = makers[0];
  
  const metaParts: string[] = [];
  if (firstMaker) metaParts.push(firstMaker.username);
  metaParts.push(`${commentCount} comment${commentCount !== 1 ? 's' : ''}`);
  if (launchDate) metaParts.push(formatDistanceToNow(new Date(launchDate), { addSuffix: true }));
  
  return (
    <Link to={`/launch/${slug}`} className="block">
      <div className="group/card flex items-start gap-3 py-2 px-2 hover:bg-muted/30 transition-colors cursor-pointer">
        <span className="text-sm font-bold text-muted-foreground w-6 text-right flex-shrink-0 pt-0.5">
          {rank}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-base text-foreground truncate">
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
          </div>
          {metaParts.length > 0 && (
            <p className="text-sm text-muted-foreground truncate">
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
