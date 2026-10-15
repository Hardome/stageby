import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';

export function ProjectListSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {[1, 2, 3].map((row) => (
          <li key={row} className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-5 text-card-foreground">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-5 w-48 max-w-full" />
            <Skeleton className="h-6 w-24" />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" disabled>
          Назад
        </Button>
        <Skeleton className="h-5 w-32" />
        <Button variant="outline" disabled>
          Далее
        </Button>
      </div>
    </div>
  );
}
