import { cn } from 'cn';
import { ArrowDownRightIcon, Building2Icon } from 'lucide-react';

import { Skeleton } from '@shared/ui/skeleton';

export function DashboardActivitySkeleton() {
  return (
    <aside
      className={cn(
        'flex flex-1 flex-col justify-between gap-4 rounded-2xl border border-surface-inverse-border',
        'bg-surface-inverse p-4 text-surface-inverse-foreground sm:p-4',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm text-surface-inverse-muted">Активных объектов</h3>
        <Building2Icon className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="flex items-end justify-between gap-4 lg:flex-col lg:items-start">
        <div className="text-5xl font-semibold tracking-tighter tabular-nums lg:text-6xl">
          <Skeleton className="h-15 w-20 lg:h-24" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="hidden items-center justify-between border-t border-surface-inverse-border pt-4 lg:flex">
        <Skeleton className="h-4 w-40" />
        <ArrowDownRightIcon className="size-4 text-primary" aria-hidden="true" />
      </div>
    </aside>
  );
}
