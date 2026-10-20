import { useEffect } from 'react';

import { keepPreviousData } from '@tanstack/react-query';

import { useAccessError } from '@shared/lib/hooks';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';

import { useListDashboardProjects } from '@api/queries/useListDashboardProjects';

import { dashboardPageSize } from '../lib/dashboard-search';
import { DashboardError } from './dashboard-error';
import { DashboardProjectResults } from './dashboard-project-results';
import { DashboardProjectsSkeleton } from './dashboard-projects-skeleton';

interface DashboardProjectsProperties {
  offset: number;
  today: string;
  onPageChange: (offset: number, shouldReplace?: boolean) => void;
}

export function DashboardProjects({ offset, today, onPageChange }: DashboardProjectsProperties) {
  const query = useListDashboardProjects(
    { query: { limit: dashboardPageSize, offset } },
    { query: { retry: false, placeholderData: keepPreviousData } },
  );
  const accessError = useAccessError();

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  useEffect(() => {
    if (
      !query.error &&
      !query.isFetching &&
      !query.isPlaceholderData &&
      query.data &&
      offset > 0 &&
      offset >= query.data.total
    ) {
      onPageChange(Math.max(0, Math.ceil(query.data.total / dashboardPageSize) - 1) * dashboardPageSize, true);
    }
  }, [query.data, query.error, query.isFetching, query.isPlaceholderData, offset, onPageChange]);

  if (query.error?.status === 403 || query.error?.status === 404) return <NotFound />;

  return (
    <section aria-label="Объекты" aria-busy={query.isFetching} className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-2xl tracking-tight">Объекты</h2>
        </div>
      </div>
      {query.error && (
        <DashboardError
          message="Не удалось загрузить объекты."
          pending={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      )}
      <DataRegion
        initialLabel="Загрузка объектов"
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        isRefreshing={query.isPlaceholderData && query.isFetching}
        skeleton={<DashboardProjectsSkeleton />}
        label="Обновляем объекты…"
      >
        {query.data && (
          <>
            {query.data.items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Объектов пока нет</EmptyTitle>
                  <EmptyDescription>Создайте первый объект, чтобы начать работу.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <DashboardProjectResults projects={query.data.items} today={today} />
            )}
            <nav aria-label="Страницы объектов" className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={offset === 0 || query.isFetching}
                onClick={() => onPageChange(Math.max(0, offset - dashboardPageSize))}
              >
                Назад
              </Button>
              <span className="text-sm">
                Страница {Math.floor(offset / dashboardPageSize) + 1} из{' '}
                {Math.max(1, Math.ceil(query.data.total / dashboardPageSize))}
              </span>
              <Button
                variant="outline"
                disabled={offset + dashboardPageSize >= query.data.total || query.isFetching}
                onClick={() => onPageChange(offset + dashboardPageSize)}
              >
                Далее
              </Button>
            </nav>
          </>
        )}
      </DataRegion>
    </section>
  );
}
