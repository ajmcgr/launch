import { formatMRRRange, getMRRColorClass } from '@/lib/revenue';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VerifiedRevenueBadgeProps {
  verifiedMrr: number | null;
  mrrVerifiedAt?: string | null;
  size?: 'sm' | 'md';
}

export function VerifiedRevenueBadge({ 
  verifiedMrr, 
  mrrVerifiedAt,
  size = 'sm'
}: VerifiedRevenueBadgeProps) {
  if (verifiedMrr === null || verifiedMrr === undefined) return null;
  
  const mrrRange = formatMRRRange(verifiedMrr);
  const colorClass = getMRRColorClass(verifiedMrr);
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  
  const verifiedDate = mrrVerifiedAt 
    ? new Date(mrrVerifiedAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${colorClass} cursor-help`}>
            <span className={`${textSize} font-medium`}>{mrrRange}</span>
            <span className={`${textSize} font-medium opacity-70`}>MRR</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-semibold">Verified MRR: {mrrRange}</p>
            <p className="text-muted-foreground">Connected via Stripe</p>
            {verifiedDate && (
              <p className="text-muted-foreground">Last verified: {verifiedDate}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
