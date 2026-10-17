import { useEffect } from 'react';

import { keepPreviousData } from '@tanstack/react-query';

import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import { useGetDashboardSummary } from '@api/queries/useGetDashboardSummary';
import { useListDashboardProjects } from '@api/queries/useListDashboardProjects';

import { dashboardPageSize, isCalculationAvailable } from '../lib/dashboard-search';
import { DashboardActivity } from './dashboard-activity';
import { DashboardActivitySkeleton } from './dashboard-activity-skeleton';
import { DashboardError } from './dashboard-error';
import { DashboardFinanceOverview } from './dashboard-finance-overview';
import { DashboardSummarySkeleton } from './dashboard-summary-skeleton';

interface DashboardSummaryProperties {
  through: string;
  today: string;
}

export function DashboardSummary({ through, today }: DashboardSummaryProperties) {
  const isAvailable = isCalculationAvailable(through, today);
  const query = useGetDashboardSummary(
    { query: { through } },
    { query: { enabled: isAvailable, retry: false, placeholderData: keepPreviousData } },
  );
  const accessError = useAccessError();
  const projects = useListDashboardProjects(
    { query: { limit: dashboardPageSize, offset: 0 } },
    { query: { enabled: isAvailable && query.data?.activeProjectCount === 0, retry: false } },
  );

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  useEffect(() => {
    if (projects.error) accessError(projects.error);
  }, [projects.error, accessError]);

  if (!isAvailable)
    return (
      <Alert>
        <AlertDescription>Расчёт недоступен</AlertDescription>
      </Alert>
    );
  if ([query.error?.status, projects.error?.status].some((status) => status === 403 || status === 404)) {
    return <NotFound />;
  }

  return (
    <section aria-label="Финансовая сводка" aria-busy={query.isFetching} className="flex flex-col gap-4">
      <h2 className="sr-only">Финансовая сводка</h2>
      {query.error && (
        <DashboardError
          message="Не удалось загрузить сводку."
          pending={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data?.activeProjectCount === 0 && projects.error && (
        <DashboardError
          message="Не удалось загрузить состояние объектов."
          pending={projects.isFetching}
          onRetry={() => void projects.refetch()}
        />
      )}
      <DataRegion
        initialLabel="Загрузка сводки"
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        isRefreshing={query.isPlaceholderData && query.isFetching}
        skeleton={<DashboardSummarySkeleton />}
        label="Обновляем сводку…"
      >
        {query.data && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
            <DataRegion
              className="grid"
              isLoading={query.data.activeProjectCount === 0 && projects.isLoading}
              isFetching={query.data.activeProjectCount === 0 && projects.isFetching}
              initialLabel="Загрузка состояния объектов"
              label="Обновляем состояние объектов…"
              skeleton={<DashboardActivitySkeleton />}
            >
              <DashboardActivity count={query.data.activeProjectCount} total={projects.data?.total} />
            </DataRegion>
            <DashboardFinanceOverview summary={query.data} through={query.data.through} />
          </div>
        )}
      </DataRegion>
    </section>
  );
}
