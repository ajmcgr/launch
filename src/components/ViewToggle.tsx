import { LayoutGrid, List } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface ViewToggleProps {
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}

export const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1 h-9">
      <Toggle
        pressed={view === 'list'}
        onPressedChange={() => onViewChange('list')}
        aria-label="List view"
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
};
