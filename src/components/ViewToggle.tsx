import { LayoutGrid, List, AlignJustify } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

export type ViewMode = 'list' | 'grid' | 'compact' | 'semi-compact';

interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  allowSemiCompact?: boolean;
}

export function ViewToggle({
  view,
  onViewChange,
  allowSemiCompact = false,
}: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1 h-9">
      <Toggle
        pressed={view === 'compact'}
        onPressedChange={() => onViewChange('compact')}
        aria-label="Compact view"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        pressed={view === (allowSemiCompact ? 'semi-compact' : 'list')}
        onPressedChange={() => onViewChange(allowSemiCompact ? 'semi-compact' : 'list')}
        aria-label={allowSemiCompact ? 'Semi-compact view' : 'List view'}
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
      >
        <List className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        pressed={view === 'grid'}
        onPressedChange={() => onViewChange('grid')}
        aria-label="Card view"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Toggle>
    </div>
  );
}

