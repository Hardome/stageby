import { cn } from 'cn';
import { ArrowDownRightIcon, Building2Icon } from 'lucide-react';

import { Skeleton } from '@shared/ui/skeleton';

export function DashboardActivity({ count, isLoading = false }: { count: number; isLoading?: boolean }) {
  return (
    <aside
      className={cn(
        'flex flex-col justify-between gap-4 rounded-2xl border border-surface-inverse-border',
        'bg-surface-inverse p-4 text-surface-inverse-foreground sm:p-4',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm text-surface-inverse-muted">Активных объектов</h3>
        <Building2Icon className="size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="flex items-end justify-between gap-4 lg:flex-col lg:items-start">
        <div className="font-semibold text-5xl tabular-nums tracking-tighter lg:text-6xl">
          {isLoading ? <Skeleton className="h-15 w-20 lg:h-24" /> : <p>{count}</p>}
        </div>
        <p className="max-w-44 text-sm text-surface-inverse-muted leading-relaxed">
          Есть этапы, которые ещё не выплачены
        </p>
      </div>
      <div className="hidden items-center justify-between border-surface-inverse-border border-t pt-4 lg:flex">
        <span className="text-surface-inverse-muted text-xs">В работе до полной выплаты</span>
        <ArrowDownRightIcon className="size-4 text-primary" aria-hidden="true" />
      </div>
    </aside>
  );
}
