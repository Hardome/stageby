import type { ReactNode } from 'react';

import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { NotFound } from '@shared/ui/not-found';
import { Spinner } from '@shared/ui/spinner';

import type { Stage } from '@api/types';

import { useStageAccess } from '../lib/use-stage-access';
import { StageChecklist } from './stage-checklist';
import { StageFinances } from './stage-finances';
import { StageProject } from './stage-project';
import { StageSummary } from './stage-summary';

interface StageOverviewProperties {
  stageId: string;
  backLink?: (stage: Stage) => ReactNode;
  actions?: (stage: Stage) => ReactNode;
}

export function StageOverview({ stageId, backLink, actions }: StageOverviewProperties) {
  const { query, invalidId } = useStageAccess(stageId);

  if (invalidId || query.error?.status === 403 || query.error?.status === 404) {
    return <NotFound />;
  }

  if (query.error) {
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

  return query.isPending ? (
    <Spinner aria-label="Загрузка этапа" />
  ) : (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backLink?.(query.data)}
        {actions?.(query.data)}
      </div>
      <StageSummary stage={query.data} refreshing={query.isFetching} />
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <StageChecklist stageId={query.data.id} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <StageProject stage={query.data} />
          <StageFinances stage={query.data} category="materials" />
          <StageFinances stage={query.data} category="work" />
        </div>
      </div>
    </>
  );
}
