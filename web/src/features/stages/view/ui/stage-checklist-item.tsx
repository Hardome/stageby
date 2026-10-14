import { cn } from 'cn';
import { CameraIcon, CheckIcon, RotateCcwIcon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';

import type { ChecklistItem } from '@api/types';

interface StageChecklistItemProperties {
  item: ChecklistItem;
}

export function StageChecklistItem({ item }: StageChecklistItemProperties) {
  const completion = item.isCompleted ? 'Готово' : 'Не выполнено';

  return (
    <li className="flex items-start gap-4 border-b py-5 first:pt-0 last:border-0 last:pb-0">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border font-semibold text-sm',
          item.isCompleted && 'border-success-border bg-success-subtle text-success',
        )}
      >
        {item.isCompleted ? <CheckIcon className="size-4" aria-hidden="true" /> : item.position}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="wrap-anywhere font-semibold leading-relaxed">{item.title}</p>
          <Badge variant={item.isCompleted ? 'success' : 'outline'}>
            {item.requiresRework ? 'Доработка' : completion}
          </Badge>
        </div>
        {item.photoHint && (
          <p className="wrap-anywhere text-muted-foreground text-sm leading-relaxed">{item.photoHint}</p>
        )}
        {item.reworkComment && (
          <p className="wrap-anywhere flex items-start gap-2 text-destructive text-sm">
            <RotateCcwIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {item.reworkComment}
          </p>
        )}
        <p className="flex items-center gap-2 text-muted-foreground text-xs">
          <CameraIcon className="size-3.5" aria-hidden="true" /> Фото: {item.photoCount}
        </p>
        {item.photosDeletedByRetention && (
          <p className="text-muted-foreground text-xs">Фото удалены по сроку хранения.</p>
        )}
      </div>
    </li>
  );
}
