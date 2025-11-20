import { LayoutGrid, List } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';

interface ViewToggleProps {
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}

export const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Toggle
        pressed={view === 'list'}
        onPressedChange={() => onViewChange('list')}
        aria-label="List view"
        size="sm"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        pressed={view === 'grid'}
        onPressedChange={() => onViewChange('grid')}
        aria-label="Grid view"
        size="sm"
      >
        <LayoutGrid className="h-4 w-4" />
      </Toggle>
    </div>
  );
};
