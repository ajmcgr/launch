import { TrendingUp, Clock, DollarSign, Star } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface SortToggleProps {
  sort: 'rated' | 'popular' | 'latest' | 'revenue';
  onSortChange: (sort: 'rated' | 'popular' | 'latest' | 'revenue') => void;
  iconOnly?: boolean;
  showRevenue?: boolean;
}

export const SortToggle = ({ sort, onSortChange, iconOnly = false, showRevenue = false }: SortToggleProps) => {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1 h-9">
      <Toggle
        pressed={sort === 'rated'}
        onPressedChange={() => onSortChange('rated')}
        aria-label="Sort by highest rated"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
      >
        <Star className={`h-3.5 w-3.5 ${iconOnly ? '' : 'mr-1'}`} />
        {!iconOnly && <span className="text-xs">Rated</span>}
      </Toggle>
      <Toggle
        pressed={sort === 'popular'}
        onPressedChange={() => onSortChange('popular')}
        aria-label="Sort by popular"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
      >
        <TrendingUp className={`h-3.5 w-3.5 ${iconOnly ? '' : 'mr-1'}`} />
        {!iconOnly && <span className="text-xs">Popular</span>}
      </Toggle>
      <Toggle
        pressed={sort === 'latest'}
        onPressedChange={() => onSortChange('latest')}
        aria-label="Sort by latest"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
      >
        <Clock className={`h-3.5 w-3.5 ${iconOnly ? '' : 'mr-1'}`} />
        {!iconOnly && <span className="text-xs">Latest</span>}
      </Toggle>
      {showRevenue && (
        <Toggle
          pressed={sort === 'revenue'}
          onPressedChange={() => onSortChange('revenue')}
          aria-label="Sort by revenue"
          size="sm"
          className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
        >
          <DollarSign className={`h-3.5 w-3.5 ${iconOnly ? '' : 'mr-1'}`} />
          {!iconOnly && <span className="text-xs">Revenue</span>}
        </Toggle>
      )}
    </div>
  );
};
