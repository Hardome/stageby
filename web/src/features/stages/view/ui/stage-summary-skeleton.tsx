import { cn } from 'cn';

import { Skeleton } from '@shared/ui/skeleton';

export function StageSummarySkeleton() {
  return (
    <header className="overflow-hidden rounded-2xl border bg-card text-card-foreground">
      <div
        className={cn(
          'grid gap-8 bg-surface-inverse p-5 text-surface-inverse-foreground',
          'sm:p-8 lg:grid-cols-[1fr_280px]',
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-9 w-3/4 sm:h-10" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div
          className={cn(
            'flex flex-col justify-between gap-4 rounded-xl border p-5',
            'border-surface-inverse-border bg-surface-inverse-accent',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="pt-1 text-sm text-surface-inverse-muted">Готовность этапа</span>
            <Skeleton className="h-10 w-16 shrink-0" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <p className="text-surface-inverse-muted text-xs">По выполненным пунктам чек-листа</p>
        </div>
      </div>
      <dl className="grid gap-5 p-5 sm:p-8 md:grid-cols-[1fr_1.3fr_1fr]">
        {['Объект · клиент', 'Плановые даты', 'Ответственный мастер'].map((label) => (
          <div key={label} className="flex min-w-0 flex-col gap-2 md:not-first:border-l md:not-first:pl-5">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd>
              <Skeleton className="h-5 w-3/4" />
            </dd>
            <dd>
              <Skeleton className="h-4 w-3/5" />
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
