import type { ReactNode } from 'react';

import { cn } from 'cn';
import { CameraIcon, ImageOffIcon, RotateCcwIcon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';

import type { ChecklistItem } from '@api/types';

import { ChecklistItemCompletion } from './checklist-item-completion';
import { ChecklistItemMarker } from './checklist-item-marker';

interface StageChecklistItemProperties {
  item: ChecklistItem;
  action?: ReactNode;
}

export function StageChecklistItem({ item, action }: StageChecklistItemProperties) {
  let statusLabel = 'Не выполнен';
  if (item.isCompleted) statusLabel = item.requiresRework ? 'Доработан' : 'Выполнен';

  return (
    <li
      className={cn(
        'group/checkpoint relative grid grid-cols-[auto_1fr] items-start gap-2 rounded-xl border bg-card p-3',
        'sm:flex sm:gap-3',
        'transition-colors motion-reduce:transition-none',
        item.requiresRework && !item.isCompleted && 'border-warning-border',
        action && 'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
        action && 'hover:border-control-border hover:bg-muted/40',
      )}
    >
      <ChecklistItemMarker item={item} />
      <div className="contents sm:flex sm:min-w-0 sm:flex-1 sm:flex-col sm:gap-2">
        <div className="col-start-2 flex min-w-0 flex-col items-start justify-between gap-2 sm:flex-row">
          {action ?? <p className="wrap-anywhere font-semibold leading-relaxed">{item.title}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {item.requiresRework && !item.isCompleted && <Badge variant="warning">Доработка</Badge>}
            {(!item.requiresRework || item.isCompleted) && (
              <Badge variant={item.isCompleted ? 'success' : 'secondary'}>{statusLabel}</Badge>
            )}
          </div>
        </div>
        <ChecklistItemCompletion item={item} className="border-b pb-2" />
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
