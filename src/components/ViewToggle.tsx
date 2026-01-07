import { LayoutGrid, List, AlignJustify } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface ViewToggleProps {
  view: 'list' | 'grid' | 'minimal';
  onViewChange: (view: 'list' | 'grid' | 'minimal') => void;
}

export const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1 h-9">
      <Toggle
        pressed={view === 'minimal'}
        onPressedChange={() => onViewChange('minimal')}
        aria-label="Minimal view"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
        title="Minimal (HN-style)"
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        pressed={view === 'list'}
        onPressedChange={() => onViewChange('list')}
        aria-label="List view"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        pressed={view === 'grid'}
        onPressedChange={() => onViewChange('grid')}
        aria-label="Card view"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
        title="Grid view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Toggle>
    </div>
  );
};
