import { TrendingUp, Clock } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface SortToggleProps {
  sort: 'popular' | 'latest';
  onSortChange: (sort: 'popular' | 'latest') => void;
  iconOnly?: boolean;
}

export const SortToggle = ({ sort, onSortChange, iconOnly = false }: SortToggleProps) => {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Toggle
        pressed={sort === 'popular'}
        onPressedChange={() => onSortChange('popular')}
        aria-label="Sort by popular"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground"
      >
        <TrendingUp className={`h-4 w-4 ${iconOnly ? '' : 'mr-1'}`} />
        {!iconOnly && <span className="text-xs">Popular</span>}
      </Toggle>
      <Toggle
        pressed={sort === 'latest'}
        onPressedChange={() => onSortChange('latest')}
        aria-label="Sort by latest"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground"
      >
        <Clock className={`h-4 w-4 ${iconOnly ? '' : 'mr-1'}`} />
        {!iconOnly && <span className="text-xs">Latest</span>}
      </Toggle>
    </div>
  );
};
