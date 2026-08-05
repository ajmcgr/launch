import { Sparkles } from 'lucide-react';
import { CAMPAIGN_NAME } from '@/lib/campaign';

interface VibeCodeBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

/** "Built through Vibe Coded It" campaign badge. */
export const VibeCodeBadge = ({ size = 'sm', className = '' }: VibeCodeBadgeProps) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium ${
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
    } ${className}`}
    title={`Built through ${CAMPAIGN_NAME}`}
  >
    <Sparkles className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
    <span className="whitespace-nowrap">
      Built through <span className="font-semibold">{CAMPAIGN_NAME}</span>
    </span>
  </span>
);

export default VibeCodeBadge;
