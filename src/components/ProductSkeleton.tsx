import { Skeleton } from '@/components/ui/skeleton';

interface ProductSkeletonProps {
  view: 'list' | 'grid';
  count?: number;
}

const ListItemSkeleton = () => (
  <div className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border">
    {/* Rank */}
    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
    
    {/* Icon */}
    <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
    
    {/* Content */}
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-4 w-48" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
    
    {/* Upvote button */}
    <div className="flex flex-col items-center gap-1">
      <Skeleton className="h-10 w-12 rounded-md" />
    </div>
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

  if (view === 'list') {
    return (
      <div className="space-y-4">
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
