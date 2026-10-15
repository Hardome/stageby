import { Skeleton } from '@shared/ui/skeleton';

export function WorkPlanRowSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border" aria-hidden="true">
      <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 px-4 pb-5 sm:grid-cols-3 sm:px-5">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex flex-col gap-2 last:col-span-2 sm:last:col-span-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t bg-background/60 px-4 py-3 sm:px-5">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="size-10" />
      </div>
    </div>
  );
}
