import { LayoutGrid, List, AlignJustify } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useIsMobile } from '@/hooks/use-mobile';

interface ViewToggleProps {
  view: 'list' | 'grid' | 'compact';
  onViewChange: (view: 'list' | 'grid' | 'compact') => void;
}

export const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  const isMobile = useIsMobile();
  
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
        pressed={view === 'list'}
        onPressedChange={() => onViewChange('list')}
        aria-label="List view"
        size="sm"
        className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
      >
        <List className="h-3.5 w-3.5" />
      </Toggle>
      {!isMobile && (
        <Toggle
          pressed={view === 'grid'}
          onPressedChange={() => onViewChange('grid')}
          aria-label="Card view"
          size="sm"
          className="data-[state=on]:bg-muted data-[state=on]:text-foreground h-7 px-2"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </Toggle>
      )}
    </div>
  );
};
