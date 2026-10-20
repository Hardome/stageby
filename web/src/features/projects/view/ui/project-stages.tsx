import { useState } from 'react';

import { todayInYekaterinburg } from '@entities/project';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { ToggleGroup, ToggleGroupItem } from '@shared/ui/toggle-group';

import type { Stage } from '@api/types';

import { ProjectStageCard } from './project-stage-card';
import { ProjectStageTable } from './project-stage-table';
import { ProjectStageTableSkeleton } from './project-stage-table-skeleton';
import { ProjectStagesSkeleton } from './project-stages-skeleton';

interface ProjectStagesProperties {
  stages?: Stage[];
  isPending: boolean;
  isFetching: boolean;
  hasError: boolean;
  onRetry: () => void;
}

export function ProjectStages({ stages, isPending, isFetching, hasError, onRetry }: ProjectStagesProperties) {
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('table');
  const included = stages
    ?.filter((stage) => stage.isIncluded)
    .toSorted((left, right) => left.position - right.position);
  const today = todayInYekaterinburg();

  return (
    <section aria-label="Этапы объекта" aria-busy={isFetching} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-2xl tracking-tight">Этапы строительства</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {included && <Badge variant="outline">Всего: {included.length}</Badge>}
          <ToggleGroup
            aria-label="Режим отображения этапов"
            value={[displayMode]}
            spacing={0}
            variant="outline"
            onValueChange={([value]) => {
              if (value === 'cards' || value === 'table') setDisplayMode(value);
            }}
          >
            <ToggleGroupItem value="table" aria-label="Таблица" className="min-h-10">
              Таблица
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Карточки" className="min-h-10">
              Карточки
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      {hasError && (
        <Alert variant="destructive">
          <AlertDescription>
            Не удалось загрузить этапы.
            <Button variant="outline" disabled={isFetching} onClick={onRetry}>
              Повторить загрузку этапов
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <DataRegion
        isLoading={isPending}
        isFetching={isFetching}
        skeleton={displayMode === 'cards' ? <ProjectStagesSkeleton /> : <ProjectStageTableSkeleton />}
        label="Обновляем этапы…"
      >
        {included?.length === 0 && <p>Включённых этапов нет.</p>}
        {displayMode === 'cards' ? (
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {included?.map((stage, index) => (
              <ProjectStageCard key={stage.id} stage={stage} number={index + 1} today={today} />
            ))}
          </div>
        ) : (
          <ProjectStageTable stages={included ?? []} today={today} />
        )}
      </DataRegion>
    </section>
  );
}
