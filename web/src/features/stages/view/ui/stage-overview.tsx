import type { ReactNode } from 'react';

import { StageChecklist, useStageAccess } from '@entities/stage';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import type { Stage } from '@api/types';

import { StageFinances } from './stage-finances';
import { StageOverviewSkeleton } from './stage-overview-skeleton';
import { StageProject } from './stage-project';
import { StageSummary } from './stage-summary';

interface StageOverviewProperties {
  stageId: string;
  backLink?: (stage: Stage) => ReactNode;
  actions?: (stage: Stage) => ReactNode;
  payments?: (stage: Stage) => ReactNode;
  checklistLink?: (stage: Stage) => ReactNode;
  acceptance?: (stage: Stage) => ReactNode;
}

export function StageOverview({
  stageId,
  backLink,
  actions,
  payments,
  checklistLink,
  acceptance,
}: StageOverviewProperties) {
  const { query, invalidId } = useStageAccess(stageId);

  if (invalidId || query.error?.status === 403 || query.error?.status === 404) {
    return <NotFound />;
  }

  if (query.error && !query.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-3">
          Не удалось загрузить этап.
          <Button variant="outline" onClick={() => void query.refetch()}>
            Повторить
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!query.data)
    return (
      <DataRegion
        initialLabel="Загрузка этапа"
        isLoading
        skeleton={<StageOverviewSkeleton withWorkSummary={!payments} />}
      />
    );

  return (
    <DataRegion isFetching={query.isFetching} label="Обновляем этап…">
      <div className="flex flex-col gap-4">
        {query.error && (
          <Alert variant="destructive">
            <AlertDescription>
              Не удалось обновить этап.
              <Button variant="outline" onClick={() => void query.refetch()}>
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backLink?.(query.data)}
          {actions?.(query.data)}
        </div>
        <StageSummary stage={query.data} refreshing={query.isFetching} />
        {acceptance?.(query.data)}
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            {checklistLink?.(query.data)}
            <StageChecklist stageId={query.data.id} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <StageProject stage={query.data} />
            <StageFinances stage={query.data} category="materials" />
            {!payments && <StageFinances stage={query.data} category="work" />}
          </div>
        </div>
        {payments?.(query.data)}
      </div>
    </DataRegion>
  );
}
