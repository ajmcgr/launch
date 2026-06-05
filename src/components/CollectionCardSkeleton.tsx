import { Skeleton } from '@/components/ui/skeleton';

interface CollectionCardSkeletonProps {
  count?: number;
}

/**
 * Skeleton matching the collection cards used on /collections,
 * /my-collections, and search results. Cover art (3:1.6) + title +
 * description + meta row.
 */
export const CollectionCardSkeleton = ({ count = 6 }: CollectionCardSkeletonProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl overflow-hidden border bg-card"
        >
          <Skeleton className="aspect-[3/1.6] w-full rounded-none" />
          <div className="p-4 flex-1 flex flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="mt-auto pt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
