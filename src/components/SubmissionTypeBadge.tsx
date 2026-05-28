import { cn } from '@/lib/utils';

interface Props {
  type?: 'founder' | 'community' | null;
  className?: string;
  size?: 'xs' | 'sm';
}

/**
 * Subtle badge identifying whether a launch was submitted by the founder
 * or by a community contributor. Renders nothing for the default founder
 * type to keep the feed visually quiet — only community launches surface.
 */
export const SubmissionTypeBadge = ({ type, className, size = 'xs' }: Props) => {
  if (type !== 'community') return null;
  const text = '🌎 Community';
  return (
    <span
      title="Community Launch — submitted by a Launch member"
      className={cn(
        'inline-flex items-center rounded-full bg-muted text-muted-foreground font-medium leading-none',
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className,
      )}
    >
      {text}
    </span>
  );
};
