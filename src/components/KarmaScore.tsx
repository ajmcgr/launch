import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import karmaIcon from '@/assets/karma-icon.png';

interface KarmaScoreProps {
  karma: number | null;
  size?: 'sm' | 'md';
}

export const KarmaScore = ({ karma, size = 'sm' }: KarmaScoreProps) => {
  if (karma === null || karma === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-0.5 text-muted-foreground ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        }`}>
          <img 
            src={karmaIcon} 
            alt="Karma" 
            className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          />
          <span className="font-medium">{karma.toLocaleString()}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{karma.toLocaleString()} karma</p>
      </TooltipContent>
    </Tooltip>
  );
};
