import { Link } from 'react-router-dom';
import { ChevronUp, ExternalLink } from 'lucide-react';
import { formatTimeAgo } from '@/lib/formatTime';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';
import { VerifiedRevenueBadge } from '@/components/VerifiedRevenueBadge';

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
  categories?: string[];
  platforms?: Platform[];
  verifiedMrr?: number | null;
  mrrVerifiedAt?: string | null;
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
  categories = [],
  platforms,
  verifiedMrr,
  mrrVerifiedAt,
}: CompactLaunchListItemProps) => {
  const firstMaker = makers[0];
  
  // Build meta parts - platforms as text between maker and comments
  const metaParts: string[] = [];
  if (categories.length > 0) metaParts.push(categories[0]);
  if (firstMaker) metaParts.push(firstMaker.username);
  if (platforms && platforms.length > 0) {
    metaParts.push(platforms.join(', '));
  }
  // MRR will be shown as badge, not in metaParts
  metaParts.push(`${commentCount} comment${commentCount !== 1 ? 's' : ''}`);
  if (launchDate) metaParts.push(formatTimeAgo(launchDate));
  
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
          <div className="flex items-center gap-1.5">
            <VerifiedRevenueBadge verifiedMrr={verifiedMrr} mrrVerifiedAt={mrrVerifiedAt} size="sm" />
            <p className="text-xs text-muted-foreground truncate">
              {metaParts.join(' · ')}
            </p>
          </div>
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
