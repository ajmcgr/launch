import { CreditCard } from 'lucide-react';
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
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function VerifiedRevenueBadge({ 
  verifiedMrr, 
  mrrVerifiedAt,
  showLabel = true,
  size = 'sm'
}: VerifiedRevenueBadgeProps) {
  if (verifiedMrr === null || verifiedMrr === undefined) return null;
  
  const mrrRange = formatMRRRange(verifiedMrr);
  const colorClass = getMRRColorClass(verifiedMrr);
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
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
            <CreditCard className={iconSize} />
            {showLabel && <span className={`${textSize} font-medium`}>{mrrRange}</span>}
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
