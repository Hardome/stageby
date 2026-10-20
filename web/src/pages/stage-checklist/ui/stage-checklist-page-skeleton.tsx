import { Card, CardContent } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function StageChecklistPageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="mb-3 flex items-start gap-3 rounded-2xl border bg-card p-3 sm:p-4">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-8 w-3/4 sm:h-9" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl border bg-secondary p-4">
            <Skeleton className="size-5 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
            <Skeleton className="h-5 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3].map((position) => (
              <div key={position} className="overflow-hidden rounded-xl border">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="flex flex-col gap-1 p-1 sm:p-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
