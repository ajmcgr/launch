import { Link, useNavigate } from 'react-router-dom';
import { ChevronUp, ExternalLink } from 'lucide-react';
import { formatTimeAgo } from '@/lib/formatTime';
import { PlatformIcons, Platform } from '@/components/PlatformIcons';
import { VerifiedRevenueBadge } from '@/components/VerifiedRevenueBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const navigate = useNavigate();
  
  // Build meta parts - split into before and after MRR
  const metaBeforeMrr: string[] = [];
  if (categories.length > 0) metaBeforeMrr.push(categories[0]);
  if (platforms && platforms.length > 0) {
    metaBeforeMrr.push(platforms.join(', '));
  }
  
  const metaAfterMrr: string[] = [];
  metaAfterMrr.push(`${commentCount} comment${commentCount !== 1 ? 's' : ''}`);
  if (launchDate) metaAfterMrr.push(formatTimeAgo(launchDate));
  
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
          {metaBeforeMrr.length > 0 && (
            <span className="truncate">{metaBeforeMrr.join(' · ')}</span>
          )}
          {hasMrr && metaBeforeMrr.length > 0 && <span>·</span>}
          <VerifiedRevenueBadge verifiedMrr={verifiedMrr} mrrVerifiedAt={mrrVerifiedAt} size="sm" />
          {hasMrr && metaAfterMrr.length > 0 && <span>·</span>}
          {!hasMrr && metaBeforeMrr.length > 0 && metaAfterMrr.length > 0 && <span>·</span>}
          <span className="truncate">{metaAfterMrr.join(' · ')}</span>
          {makers.length > 0 && (
            <div className="flex -space-x-1 flex-shrink-0 ml-1">
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
  );
};
