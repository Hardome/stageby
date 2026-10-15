import { Skeleton } from '@shared/ui/skeleton';

export function StageChecklistSkeleton() {
  return (
    <ol aria-hidden="true" className="flex flex-col">
      {[1, 2, 3].map((row) => (
        <li key={row} className="flex items-start gap-4 border-b py-5 first:pt-0 last:border-0 last:pb-0">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Skeleton className="h-6 w-3/5" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-5 w-4/5" />
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              Фото: <Skeleton className="h-4 w-6" />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
