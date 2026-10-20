import type { ReactNode } from 'react';

import { ProjectDocumentsCard } from '@entities/project';
import { useStageAccess } from '@entities/stage';
import { Accordion } from '@shared/ui/accordion';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import type { Stage } from '@api/types';

import { StageOverviewSkeleton } from './stage-overview-skeleton';
import { StageSidebarBlock } from './stage-sidebar-block';
import { StageSummary } from './stage-summary';

interface StageOverviewProperties {
  stageId: string;
  backLink?: (stage: Stage) => ReactNode;
  actions?: (stage: Stage) => ReactNode;
  content?: (stage: Stage) => ReactNode;
  acceptance?: (stage: Stage) => ReactNode;
}

function getAcceptanceSummary(stage: Stage) {
  if (stage.status === 'acceptance') return 'Работы готовы к проверке';
  if (stage.status === 'rework') return 'На доработке';

  return stage.latestAcceptance?.decision === 'accepted' ? 'Этап принят' : 'Замечания по приёмке';
}

export function StageOverview({ stageId, backLink, actions, content, acceptance }: StageOverviewProperties) {
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

  if (!query.data) return <DataRegion initialLabel="Загрузка этапа" isLoading skeleton={<StageOverviewSkeleton />} />;

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
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="order-2 min-w-0 lg:order-1">{content?.(query.data)}</div>
          <Accordion
            render={<aside aria-label="Проект и приёмка" />}
            multiple={false}
            className="order-1 min-w-0 gap-4 lg:order-2"
          >
            <StageSidebarBlock title="Проект" summary={`Документов: ${query.data.projectDocumentFileIds.length}`}>
              <ProjectDocumentsCard fileIds={query.data.projectDocumentFileIds} />
            </StageSidebarBlock>
            {(query.data.status === 'acceptance' || query.data.latestAcceptance) && (
              <StageSidebarBlock title="Приёмка работ" summary={getAcceptanceSummary(query.data)}>
                {acceptance?.(query.data)}
              </StageSidebarBlock>
            )}
          </Accordion>
        </div>
      </div>
    </DataRegion>
  );
}
