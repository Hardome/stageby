import { todayInYekaterinburg } from '@entities/project';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';

import type { Stage } from '@api/types';

import { ProjectStageCard } from './project-stage-card';

interface ProjectStagesProperties {
  stages?: Stage[];
  isPending: boolean;
  isFetching: boolean;
  hasError: boolean;
  onRetry: () => void;
}

export function ProjectStages({ stages, isPending, isFetching, hasError, onRetry }: ProjectStagesProperties) {
  const included = stages
    ?.filter((stage) => stage.isIncluded)
    .toSorted((left, right) => left.position - right.position);
  const today = todayInYekaterinburg();
  return (
    <section aria-label="Этапы объекта" aria-busy={isFetching} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-2xl tracking-tight">Этапы строительства</h2>
          <p className="text-muted-foreground text-sm">Последовательность и состояние работ</p>
        </div>
        {included && <Badge variant="outline">Всего: {included.length}</Badge>}
      </div>
      {isPending && <Skeleton className="h-48" role="status" aria-label="Загрузка этапов" />}
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
      {included?.length === 0 && <p>Включённых этапов нет.</p>}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {included?.map((stage, index) => (
          <ProjectStageCard key={stage.id} stage={stage} number={index + 1} today={today} />
        ))}
      </div>
    </section>
  );
}
