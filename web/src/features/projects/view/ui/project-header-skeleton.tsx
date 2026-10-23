import { cn } from 'cn';
import { ArrowUpRightIcon, MapPinIcon, PencilIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';

export function ProjectHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button className="self-start" variant="ghost" disabled>
          ← Дашборд
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled>
            Открыть на карте <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
          <Button variant="outline" disabled>
            <PencilIcon data-icon="inline-start" /> Редактировать объект
          </Button>
        </div>
      </div>
      <header className="overflow-hidden rounded-2xl border bg-card text-card-foreground">
        <div
          className={cn(
            'grid gap-4 bg-surface-inverse p-3 text-surface-inverse-foreground',
            'sm:p-4 lg:grid-cols-[1fr_280px]',
          )}
        >
          <div className="flex min-w-0 flex-col items-start gap-4">
            <div className="flex w-full flex-wrap items-center gap-3">
              <Skeleton className="h-9 w-48 max-w-full sm:h-10" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex w-full max-w-xl items-center gap-2">
              <MapPinIcon className="size-4 shrink-0 text-surface-inverse-muted" aria-hidden="true" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          </div>
          <div
            className={cn(
              'grid grid-cols-2 gap-4 rounded-xl border border-surface-inverse-border',
              'bg-surface-inverse-accent p-4',
            )}
          >
            {['Начало', 'Завершение'].map((label) => (
              <div
                key={label}
                className="flex flex-col gap-2 last:border-l last:border-surface-inverse-foreground/25 last:pl-3"
              >
                <span className="text-xs text-surface-inverse-muted">{label}</span>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4 sm:px-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Координаты: <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </header>
    </div>
  );
}
