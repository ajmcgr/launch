import { Link } from 'react-router-dom';
import { ChevronUp, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
  
  return (
    <Link to={`/launch/${slug}`} className="block">
      <div className="group/card flex items-center gap-2 py-2 px-2 hover:bg-muted/30 transition-colors cursor-pointer">
        <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">
          {rank}.
        </span>
        <h3 className="font-medium text-sm text-foreground flex-1 truncate">
          {name}
        </h3>
        
        {/* Maker avatar */}
        {firstMaker && (
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarImage src={firstMaker.avatar_url} alt={firstMaker.username} />
            <AvatarFallback className="text-[10px]">
              {firstMaker.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        
        {/* Comment count */}
        {commentCount > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground flex-shrink-0">
            <MessageCircle className="h-3 w-3" />
            {commentCount}
          </span>
        )}
        
        {/* Timestamp */}
        {launchDate && (
          <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
            {formatDistanceToNow(new Date(launchDate), { addSuffix: true })}
          </span>
        )}
        
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
          className={`flex items-center gap-0.5 text-sm touch-manipulation active:scale-95 transition-colors flex-shrink-0 ${
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
