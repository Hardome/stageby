import { cn } from 'cn';
import { ClipboardCheckIcon, LayersIcon, LockKeyholeIcon, MapPinIcon, RotateCcwIcon } from 'lucide-react';

import { stageStatuses } from '@entities/project';
import { Badge } from '@shared/ui/badge';

import type { Stage } from '@api/types';

interface ChecklistHeadingProperties {
  stage: Stage;
  photos: boolean;
}

export function ChecklistHeading({ stage, photos }: ChecklistHeadingProperties) {
  return (
    <header className="mb-3 flex flex-col gap-3 rounded-2xl border bg-card p-3 text-card-foreground sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={cn(
            'flex items-center gap-2 font-semibold text-muted-foreground text-xs',
            'uppercase tracking-widest',
          )}
        >
          <LayersIcon className="size-4" aria-hidden="true" />
          {stage.title}
          {stage.includedStageNumber !== null && (
            <span>
              · Этап {stage.includedStageNumber} из {stage.includedStageCount}
            </span>
          )}
        </span>
        <Badge variant={stage.status === 'rework' ? 'warning' : 'outline'}>{stageStatuses[stage.status]}</Badge>
      </div>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'hidden size-10 shrink-0 items-center justify-center rounded-xl border',
            'bg-secondary text-primary-text sm:flex',
          )}
        >
          <ClipboardCheckIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="wrap-anywhere font-bold text-2xl tracking-tight sm:text-3xl">
            {photos ? 'Фото контрольной точки' : 'Рабочий чек-лист'}
          </h1>
          <p className="wrap-anywhere flex items-start gap-2 text-muted-foreground text-sm">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {stage.projectAddress}
          </p>
        </div>
      </div>
      {stage.status === 'acceptance' && (
        <p className="flex items-start gap-2 border-t pt-4 text-muted-foreground text-sm">
          <LockKeyholeIcon className="size-4 shrink-0" aria-hidden="true" />
          Этап на приёмке. Мастеру доступен просмотр.
        </p>
      )}
      {stage.status === 'rework' && (
        <p className="flex items-start gap-2 border-t pt-4 text-muted-foreground text-sm">
          <RotateCcwIcon className="size-4 shrink-0" aria-hidden="true" />
          Мастер может изменять только возвращённые пункты.
        </p>
      )}
      {(stage.projectIsArchived || !stage.isIncluded || stage.status === 'completed' || stage.status === 'paid') && (
        <p className="flex items-start gap-2 border-t pt-4 text-muted-foreground text-sm">
          <LockKeyholeIcon className="size-4 shrink-0" aria-hidden="true" />
          Доступен только просмотр.
        </p>
      )}
    </header>
  );
}
