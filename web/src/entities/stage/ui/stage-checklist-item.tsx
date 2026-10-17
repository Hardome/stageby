import type { ReactNode } from 'react';

import { cn } from 'cn';
import { CameraIcon, CheckIcon, ImageOffIcon, RotateCcwIcon, ScanLineIcon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';

import type { ChecklistItem } from '@api/types';

interface StageChecklistItemProperties {
  item: ChecklistItem;
  action?: ReactNode;
}

export function StageChecklistItem({ item, action }: StageChecklistItemProperties) {
  const completion = item.isCompleted ? 'Готово' : 'Не выполнено';
  const completionVariant = item.isCompleted ? 'success' : 'secondary';

  return (
    <li
      className={cn(
        'group/checkpoint relative grid grid-cols-[auto_1fr] items-start gap-2 rounded-xl border bg-card p-3',
        'sm:flex sm:gap-3',
        'transition-colors motion-reduce:transition-none',
        item.requiresRework && 'border-warning-border',
        action && 'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
        action && 'hover:border-control-border hover:bg-muted/40',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border bg-secondary',
          'font-bold text-secondary-foreground tabular-nums',
          item.isCompleted && !item.requiresRework && 'border-success-border bg-success-subtle text-success',
          item.requiresRework && 'border-warning-border bg-warning-subtle text-warning-foreground',
        )}
      >
        {item.isCompleted ? <CheckIcon className="size-5" aria-hidden="true" /> : item.position}
      </span>
      <div className="contents sm:flex sm:min-w-0 sm:flex-1 sm:flex-col sm:gap-2">
        <div className="col-start-2 flex min-w-0 flex-col items-start justify-between gap-2 sm:flex-row">
          {action ?? <p className="wrap-anywhere font-semibold leading-relaxed">{item.title}</p>}
          <Badge variant={item.requiresRework ? 'warning' : completionVariant}>
            {item.requiresRework ? 'Доработка' : completion}
          </Badge>
        </div>
        {item.photoHint && (
          <p className="wrap-anywhere col-span-2 flex items-start gap-2 text-muted-foreground text-sm leading-normal">
            <ScanLineIcon className="mt-1 size-4 shrink-0" aria-hidden="true" />
            {item.photoHint}
          </p>
        )}
        {item.reworkComment && (
          <div
            className={cn(
              'col-span-2 flex items-start gap-2 rounded-lg border border-warning-border',
              'bg-warning-subtle p-2 text-sm text-warning-foreground',
            )}
          >
            <RotateCcwIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-semibold">Замечание руководителя</p>
              <p className="wrap-anywhere leading-normal">{item.reworkComment}</p>
            </div>
          </div>
        )}
        <p className="col-span-2 flex items-center gap-2 text-muted-foreground text-xs">
          <CameraIcon className="size-3.5" aria-hidden="true" />{' '}
          {item.photoCount > 0 ? `Фото: ${item.photoCount}` : 'Фото не приложены'}
        </p>
        {item.photosDeletedByRetention && (
          <p className="col-span-2 flex items-start gap-2 text-muted-foreground text-xs">
            <ImageOffIcon className="size-3.5 shrink-0" aria-hidden="true" />
            Фото удалены по сроку хранения. Выполнение сохраняется.
          </p>
        )}
      </div>
    </li>
  );
}
