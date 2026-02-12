import { Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KarmaScoreProps {
  karma: number | null;
  size?: 'sm' | 'md';
}

export const KarmaScore = ({ karma, size = 'sm' }: KarmaScoreProps) => {
  if (karma === null || karma === 0) return null;

  const location = useLocation();
  const isOnMakers = location.pathname === '/makers';

  const content = (
    <span className={`inline-flex items-center gap-0.5 text-muted-foreground ${
      size === 'sm' ? 'text-xs' : 'text-sm'
    }`}>
      <Zap className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span className="font-medium">{karma.toLocaleString()}</span>
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {isOnMakers ? content : (
          <Link to="/makers" className="hover:text-primary transition-colors">
            {content}
          </Link>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{karma.toLocaleString()} karma</p>
      </TooltipContent>
    </Tooltip>
  );
};
