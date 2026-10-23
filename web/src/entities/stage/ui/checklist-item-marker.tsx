import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';

import type { ChecklistItem } from '@api/types';

interface ChecklistItemMarkerProperties {
  item: ChecklistItem;
}

export function ChecklistItemMarker({ item }: Readonly<ChecklistItemMarkerProperties>) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg border bg-secondary',
        'font-bold text-secondary-foreground tabular-nums',
        item.isCompleted && 'border-success-border bg-success-subtle text-success',
        item.requiresRework && !item.isCompleted && 'border-warning-border bg-warning-subtle text-warning-foreground',
      )}
    >
      {item.isCompleted ? <CheckIcon className="size-5" aria-hidden="true" /> : item.position}
    </span>
  );
}
