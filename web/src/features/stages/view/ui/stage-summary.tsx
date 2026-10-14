import { cn } from 'cn';
import { LayersIcon } from 'lucide-react';

import { stageStatuses } from '@entities/project';
import { Badge } from '@shared/ui/badge';

import type { Stage } from '@api/types';

import { StageDetails } from './stage-details';

interface StageSummaryProperties {
  stage: Stage;
  refreshing: boolean;
}

export function StageSummary({ stage, refreshing }: StageSummaryProperties) {
  const isComplete = stage.status === 'completed' || stage.status === 'paid';

  return (
    <header className="overflow-hidden rounded-2xl border bg-card text-card-foreground" aria-busy={refreshing}>
      <div
        className={cn(
          'grid gap-8 bg-surface-inverse p-5 text-surface-inverse-foreground',
          'sm:p-8 lg:grid-cols-[1fr_280px]',
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'flex items-center gap-2 font-medium text-surface-inverse-muted text-xs',
                'uppercase tracking-widest',
              )}
            >
              <LayersIcon className="size-4" aria-hidden="true" />
              {stage.includedStageNumber === null
                ? 'Этап исключён'
                : `Этап ${stage.includedStageNumber} из ${stage.includedStageCount}`}
            </span>
            <Badge variant={isComplete ? 'success' : 'secondary'}>{stageStatuses[stage.status]}</Badge>
          </div>
          <h1 className="wrap-anywhere font-bold text-3xl tracking-tight sm:text-4xl">{stage.title}</h1>
          <p className="wrap-anywhere max-w-xl text-sm text-surface-inverse-muted leading-relaxed">
            {stage.projectAddress}
          </p>
          {stage.workSubtypes.length > 0 && (
            <p className="wrap-anywhere text-surface-inverse-muted text-xs">{stage.workSubtypes.join(' · ')}</p>
          )}
        </div>
        <div
          className={cn(
            'flex flex-col justify-between gap-4 rounded-xl border p-5',
            'border-surface-inverse-border bg-surface-inverse-accent',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <label htmlFor="stage-progress" className="pt-1 text-sm text-surface-inverse-muted">
              Готовность этапа
            </label>
            <span className="font-bold text-4xl tabular-nums tracking-tight">
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
          <p className="text-surface-inverse-muted text-xs">По выполненным пунктам чек-листа</p>
        </div>
      </div>
      <StageDetails stage={stage} />
      {(stage.projectIsArchived || refreshing) && (
        <div className="border-t px-5 py-3 sm:px-8">
          {stage.projectIsArchived && (
            <p className="text-muted-foreground text-sm">Объект в архиве. Доступен просмотр.</p>
          )}
          {refreshing && (
            <p role="status" className="text-muted-foreground text-sm">
              Обновление этапа…
            </p>
          )}
        </div>
      )}
    </header>
  );
}
