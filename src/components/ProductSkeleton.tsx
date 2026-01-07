import { Skeleton } from '@/components/ui/skeleton';

interface ProductSkeletonProps {
  view: 'list' | 'grid' | 'compact';
  count?: number;
}

const ListItemSkeleton = () => (
  <div className="flex items-start gap-3 py-3 px-2">
    {/* Icon */}
    <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
    
    {/* Content */}
    <div className="flex-1 min-w-0 space-y-1.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-48" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-14 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
    </div>
    
    {/* Upvote button */}
    <Skeleton className="h-9 w-10 rounded-md" />
  </div>
);

const CompactItemSkeleton = () => (
  <div className="flex items-center gap-2 py-2 px-2">
    <Skeleton className="h-4 w-6" />
    <Skeleton className="h-4 flex-1 max-w-48" />
    <Skeleton className="h-4 w-8" />
  </div>
);

const CardSkeleton = () => (
  <div className="bg-card rounded-lg border border-border p-4 space-y-4">
    {/* Header with icon and title */}
    <div className="flex items-start gap-3">
      <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-10 w-12 rounded-md" />
    </div>
    
    {/* Tagline */}
    <Skeleton className="h-4 w-full" />
    
    {/* Categories */}
    <div className="flex gap-2">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  </div>
);

export const ProductSkeleton = ({ view, count = 5 }: ProductSkeletonProps) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (view === 'compact') {
    return (
      <div>
        {skeletons.map((i) => (
          <CompactItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="space-y-1">
        {skeletons.map((i) => (
          <ListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skeletons.map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
};
