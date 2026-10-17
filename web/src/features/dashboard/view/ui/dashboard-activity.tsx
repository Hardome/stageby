import { cn } from 'cn';
import { ArrowDownRightIcon, Building2Icon } from 'lucide-react';

import { Skeleton } from '@shared/ui/skeleton';

interface DashboardActivityProperties {
  count: number;
  total?: number;
  isLoading?: boolean;
}

export function DashboardActivity({ count, total, isLoading = false }: DashboardActivityProperties) {
  let description = '';
  if (count > 0) description = 'Есть этапы, которые ещё не выплачены';
  else if (total) description = 'Все этапы выплачены';
  const hasDescription = count > 0 || Boolean(total);

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
        {isLoading && <Skeleton className="h-10 w-44" />}
        {!isLoading && hasDescription && (
          <p className="max-w-44 text-sm text-surface-inverse-muted leading-relaxed">{description}</p>
        )}
      </div>
      {(isLoading || count > 0) && (
        <div className="hidden items-center justify-between border-surface-inverse-border border-t pt-4 lg:flex">
          {isLoading && <Skeleton className="h-4 w-40" />}
          {!isLoading && <span className="text-surface-inverse-muted text-xs">В работе до полной выплаты</span>}
          <ArrowDownRightIcon className="size-4 text-primary" aria-hidden="true" />
        </div>
      )}
    </aside>
  );
}
