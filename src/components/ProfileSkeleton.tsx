import { Skeleton } from '@/components/ui/skeleton';

export const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <Skeleton className="h-40 md:h-56 w-full rounded-none" />

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="-mt-10 md:-mt-12 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-7 pt-2">
            <Skeleton className="h-28 w-28 md:h-36 md:w-36 rounded-full ring-4 ring-background shrink-0" />

            <div className="flex-1 w-full md:pb-2 pt-6 md:pt-10 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-7 w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-28 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-72" />
              <div className="flex gap-5 pt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-4 w-20" />
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border pb-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5 w-24" />
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
};
