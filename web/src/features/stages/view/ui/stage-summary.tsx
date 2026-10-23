import { cn } from 'cn';
import { LayersIcon, MapPinIcon } from 'lucide-react';

import { stageStatuses } from '@entities/project';
import { Badge } from '@shared/ui/badge';

import type { Stage } from '@api/types';

import { StageDetails } from './stage-details';

interface StageSummaryProperties {
  stage: Stage;
  refreshing: boolean;
}

export function StageSummary({ stage, refreshing }: Readonly<StageSummaryProperties>) {
  const isComplete = stage.status === 'completed' || stage.status === 'paid';

  return (
    <header className="overflow-hidden rounded-2xl border bg-card text-card-foreground" aria-busy={refreshing}>
      <div
        className={cn(
          'grid gap-4 bg-surface-inverse p-3 text-surface-inverse-foreground',
          'sm:p-4 lg:grid-cols-[1fr_280px]',
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'flex items-center gap-2 text-xs font-medium text-surface-inverse-muted',
                'tracking-widest uppercase',
              )}
            >
              <LayersIcon className="size-4" aria-hidden="true" />
              {stage.includedStageNumber === null
                ? 'Этап исключён'
                : `Этап ${stage.includedStageNumber} из ${stage.includedStageCount}`}
            </span>
            <Badge variant={isComplete ? 'success' : 'secondary'}>{stageStatuses[stage.status]}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight wrap-anywhere sm:text-3xl">{stage.title}</h1>
          <p className="flex max-w-xl items-center gap-2 text-sm leading-relaxed text-surface-inverse-muted">
            <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 wrap-anywhere">{stage.projectAddress}</span>
          </p>
          {stage.workSubtypes.length > 0 && (
            <p className="text-xs wrap-anywhere text-surface-inverse-muted">{stage.workSubtypes.join(' · ')}</p>
          )}
        </div>
        <div
          className={cn(
            'flex flex-col justify-between gap-4 rounded-xl border p-4',
            'border-surface-inverse-border bg-surface-inverse-accent',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <label htmlFor="stage-progress" className="pt-1 text-sm text-surface-inverse-muted">
              Готовность этапа
            </label>
            <span className="text-4xl font-bold tracking-tight tabular-nums">
              {stage.progressPercent}
              <span className="ml-1 text-lg text-surface-inverse-muted">%</span>
            </span>
          </div>
          <progress
            id="stage-progress"
            max={100}
            value={stage.progressPercent}
            className={cn(
              'h-2 w-full appearance-none overflow-hidden rounded-full border-0 bg-surface-inverse',
              '[&::-webkit-progress-bar]:bg-surface-inverse',
              '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary',
            )}
          />
        </div>
      </div>
      <StageDetails stage={stage} />
      {stage.projectIsArchived && (
        <div className="border-t px-4 py-3 sm:px-5">
          {stage.projectIsArchived && (
            <p className="text-sm text-muted-foreground">Объект в архиве. Доступен просмотр.</p>
          )}
        </div>
      )}
    </header>
  );
}
