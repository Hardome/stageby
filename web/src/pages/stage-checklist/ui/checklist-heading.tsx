import { LockKeyholeIcon, MapPinIcon } from 'lucide-react';

import { ChecklistItemCompletion, ChecklistItemMarker } from '@entities/stage';

import type { ChecklistItem, Stage } from '@api/types';

interface ChecklistHeadingProperties {
  stage: Stage;
  item: ChecklistItem;
  canEdit: boolean;
}

export function ChecklistHeading({ stage, item, canEdit }: ChecklistHeadingProperties) {
  return (
    <header className="mb-3 flex flex-col gap-3 rounded-2xl border bg-card p-3 text-card-foreground sm:p-4">
      <div className="flex items-start gap-3">
        <ChecklistItemMarker item={item} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="wrap-anywhere font-bold text-2xl tracking-tight sm:text-3xl">{item.title}</h1>
          <p className="wrap-anywhere flex items-start gap-2 text-muted-foreground text-sm">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {stage.projectAddress} · {stage.projectOwnerName}
            </span>
          </p>
        </div>
      </div>
      <ChecklistItemCompletion item={item} className="border-t pt-3" />
      {(stage.status === 'acceptance' || !canEdit) && (
        <p className="flex items-center gap-2 border-t pt-4 text-muted-foreground text-sm">
          <LockKeyholeIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {stage.status === 'acceptance' && 'Этап на приёмке.'}
            {stage.status === 'acceptance' && !canEdit && <br />}
            {!canEdit && 'Доступен только просмотр.'}
          </span>
        </p>
      )}
    </header>
  );
}
