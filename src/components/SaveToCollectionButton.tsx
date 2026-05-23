import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaveToCollectionModal } from '@/components/SaveToCollectionModal';
import { cn } from '@/lib/utils';

interface Props {
  productId: string;
  productName?: string;
  variant?: 'icon' | 'full' | 'bare';
  className?: string;
}

export const SaveToCollectionButton = ({ productId, productName, variant = 'icon', className }: Props) => {
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      {variant === 'bare' ? (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Save to collection"
          className={cn('inline-flex items-center text-muted-foreground hover:text-primary transition-colors', className)}
        >
          <Bookmark className="h-3 w-3" strokeWidth={2} />
        </button>
      ) : variant === 'icon' ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={handleClick}
          aria-label="Save to collection"
          className={cn('h-8 w-8 text-muted-foreground hover:text-primary', className)}
        >
          <Bookmark className="h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={handleClick} variant="outline" className={className}>
          <Bookmark className="h-4 w-4 mr-1" /> Save
        </Button>
      )}
      <SaveToCollectionModal
        open={open}
        onOpenChange={setOpen}
        productId={productId}
        productName={productName}
      />
    </>
  );
};
