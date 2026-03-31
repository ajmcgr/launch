import { Link, useNavigate } from 'react-router-dom';
import { ChevronUp, ExternalLink } from 'lucide-react';
import { formatTimeAgo } from '@/lib/formatTime';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';
import { VerifiedRevenueBadge } from '@/components/VerifiedRevenueBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isActiveLaunch, formatLaunchCountdown } from '@/lib/launchWindow';
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
  isBoosted?: boolean;
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
  isBoosted = false,
}: CompactLaunchListItemProps) => {
  const navigate = useNavigate();
  
  // Build meta parts - split into before and after MRR
  const metaBeforeMrr: string[] = [];
  if (categories.length > 0) metaBeforeMrr.push(categories[0]);
  if (platforms && platforms.length > 0) {
    metaBeforeMrr.push(platforms.join(', '));
  }
  
  const metaAfterMrr: string[] = [];
  metaAfterMrr.push(`${commentCount} comment${commentCount !== 1 ? 's' : ''}`);
  if (launchDate && !isActiveLaunch(launchDate)) metaAfterMrr.push(formatTimeAgo(launchDate));
  
  const hasMrr = verifiedMrr !== null && verifiedMrr !== undefined;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }
    navigate(`/launch/${slug}`);
  };
  
  return (
    <div 
      className="group/card flex items-start gap-3 py-2 px-2 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <span className="text-sm font-bold text-muted-foreground w-6 text-right flex-shrink-0 pt-0.5">
        {rank}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-base text-foreground truncate">
            {name}
          </h3>
          {rank <= 3 && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              rank === 1 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
              rank === 2 ? 'bg-gray-400/10 text-gray-500 dark:text-gray-400' :
              'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              {rank === 1 ? 'Gold' : rank === 2 ? 'Silver' : 'Bronze'}
            </span>
          )}
           {isBoosted && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
                Boosted
              </span>
            )}
            {launchDate && isActiveLaunch(launchDate) && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex-shrink-0">
                Live · {formatLaunchCountdown(launchDate)}
              </span>
            )}
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
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {categories.length > 0 && (
            <span className="truncate">{categories[0]}</span>
          )}
          {makers.length > 0 && (
            <>
              {categories.length > 0 && <span>·</span>}
              <div className="flex -space-x-1 flex-shrink-0">
                {makers.filter(m => m && m.username).slice(0, 2).map((maker) => (
                  <Link 
                    key={maker.username}
                    to={`/@${maker.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:z-10"
                  >
                    <Avatar className="h-4 w-4 border border-background hover:ring-1 hover:ring-primary transition-all">
                      <AvatarImage src={maker.avatar_url} alt={maker.username} />
                      <AvatarFallback className="text-[8px]">{maker.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
              </div>
            </>
          )}
          {(platforms && platforms.length > 0) && (
            <>
              {(categories.length > 0 || makers.length > 0) && <span>·</span>}
              <span className="truncate">{platforms.join(', ')}</span>
            </>
          )}
          {hasMrr && (
            <>
              {(categories.length > 0 || makers.length > 0 || (platforms && platforms.length > 0)) && <span>·</span>}
              <VerifiedRevenueBadge verifiedMrr={verifiedMrr} mrrVerifiedAt={mrrVerifiedAt} size="sm" />
            </>
          )}
          {metaAfterMrr.length > 0 && (
            <>
              {(categories.length > 0 || makers.length > 0 || (platforms && platforms.length > 0) || hasMrr) && <span>·</span>}
              <span className="truncate">{metaAfterMrr.join(' · ')}</span>
            </>
          )}
        </div>
      </div>
      
      {/* Vote button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote();
        }}
        className={`flex items-center gap-0.5 text-sm touch-manipulation active:scale-95 transition-colors flex-shrink-0 pt-0.5 ${
          userVote === 1 ? 'text-primary' : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <ChevronUp className="h-4 w-4" />
        <span className="font-medium text-xs">{Math.max(0, votes)}</span>
      </button>
    </div>
  );
};
