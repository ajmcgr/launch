import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Profile Card Skeleton */}
        <Card className="p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />

            <div className="flex-1 w-full">
              {/* Name and bio section */}
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
                {/* Follow button placeholder */}
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>

              {/* Stats */}
              <div className="flex gap-6 mb-4">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>

              {/* Social links */}
              <div className="flex gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </div>
          </div>
        </Card>

        {/* Content Section Skeleton */}
        <div>
          <Skeleton className="h-7 w-32 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
