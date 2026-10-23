import type { ReactNode } from 'react';

import { cn } from 'cn';

import { Spinner } from './spinner';

interface DataRegionProperties {
  isLoading?: boolean;
  isFetching?: boolean;
  isRefreshing?: boolean;
  children?: ReactNode;
  skeleton?: ReactNode;
  label?: string;
  initialLabel?: string;
  className?: string;
}

export function DataRegion({
  isLoading = false,
  isFetching = false,
  isRefreshing = false,
  children,
  skeleton,
  label = 'Обновляем…',
  initialLabel = 'Загрузка данных…',
  className,
}: Readonly<DataRegionProperties>) {
  let state = 'idle';
  if (isLoading) state = 'initial';
  else if (isRefreshing) state = 'refreshing';
  else if (isFetching) state = 'background';

  return (
    <div
      data-slot="data-region"
      data-state={state}
      aria-busy={isLoading || isFetching || isRefreshing}
      className={cn('relative min-w-0', className)}
    >
      <div inert={state === 'refreshing' || undefined} className="flex min-w-0 flex-col gap-4">
        {state === 'initial' ? skeleton : children}
      </div>
      {state === 'initial' && (
        <span role="status" aria-label={initialLabel} className="sr-only">
          {initialLabel}
        </span>
      )}
      {state === 'refreshing' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-background/50">
          <span role="status" className="flex items-center gap-2 text-sm">
            <Spinner aria-hidden="true" role="presentation" />
            {label}
          </span>
        </div>
      )}
      {state === 'background' && (
        <span
          role="status"
          className={cn(
            'absolute top-2 right-2 flex items-center gap-2 rounded-md bg-background px-2 py-1',
            'text-xs text-muted-foreground',
          )}
        >
          <Spinner aria-hidden="true" role="presentation" />
          {label}
        </span>
      )}
    </div>
  );
}
