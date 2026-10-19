import { Skeleton } from '@shared/ui/skeleton';

export function MaterialsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-xl">Счета</h2>
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-5 shrink-0" />
              <div className="flex flex-1 flex-col gap-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex gap-2 sm:pl-8">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-24 sm:ml-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
