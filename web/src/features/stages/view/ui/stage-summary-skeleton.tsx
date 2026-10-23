import { cn } from 'cn';
import { CalendarDaysIcon, MapPinIcon, UserRoundIcon } from 'lucide-react';

import { Skeleton } from '@shared/ui/skeleton';

export function StageSummarySkeleton() {
  return (
    <header className="overflow-hidden rounded-2xl border bg-card text-card-foreground">
      <div
        className={cn(
          'grid gap-4 bg-surface-inverse p-3 text-surface-inverse-foreground',
          'sm:p-4 lg:grid-cols-[1fr_280px]',
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-9 w-3/4 sm:h-10" />
          <div className="flex w-full max-w-xl items-center gap-2">
            <MapPinIcon className="size-4 shrink-0 text-surface-inverse-muted" aria-hidden="true" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </div>
        <div
          className={cn(
            'flex flex-col justify-between gap-4 rounded-xl border p-4',
            'border-surface-inverse-border bg-surface-inverse-accent',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="pt-1 text-sm text-surface-inverse-muted">Готовность этапа</span>
            <Skeleton className="h-10 w-16 shrink-0" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
      <dl className="grid min-h-24 grid-cols-2 gap-3 p-4 md:grid-cols-[1fr_1.3fr_1fr]">
        {['Объект · клиент', 'Плановые даты', 'Мастер'].map((label) => (
          <div
            key={label}
            className={cn(
              'flex min-w-0 flex-col not-first:gap-1 first:gap-2 last:col-span-2',
              'md:not-first:border-l md:not-first:pl-4 md:last:col-span-1',
            )}
          >
            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
              {label === 'Плановые даты' && <CalendarDaysIcon className="size-4" aria-hidden="true" />}
              {label === 'Мастер' && <UserRoundIcon className="size-4" aria-hidden="true" />}
              {label}
            </dt>
            <dd>
              <Skeleton className="h-5 w-3/4" />
            </dd>
            {label !== 'Объект · клиент' && (
              <dd>
                <Skeleton className="h-4 w-3/5" />
              </dd>
            )}
          </div>
        ))}
      </dl>
    </header>
  );
}
