import { Skeleton } from '@shared/ui/skeleton';

import { WorkPlanRowSkeleton } from './work-plan-row-skeleton';

export function WorkPaymentsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-12 w-44" />
      </div>
      <WorkPlanRowSkeleton />
      <WorkPlanRowSkeleton />
    </div>
  );
}
