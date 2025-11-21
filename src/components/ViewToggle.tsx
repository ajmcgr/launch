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
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <List className="h-4 w-4 mr-1.5" />
        <span className="text-sm font-medium">List</span>
      </Toggle>
      <Toggle
        pressed={view === 'grid'}
        onPressedChange={() => onViewChange('grid')}
        aria-label="Card view"
        size="sm"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <LayoutGrid className="h-4 w-4 mr-1.5" />
        <span className="text-sm font-medium">Card</span>
      </Toggle>
    </div>
  );
};
