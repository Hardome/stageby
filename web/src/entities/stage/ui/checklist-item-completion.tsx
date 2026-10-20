import { cn } from 'cn';

import { formatDateTime } from '@shared/lib/format-date-time';

import type { ChecklistItem } from '@api/types';

interface ChecklistItemCompletionProperties {
  item: ChecklistItem;
  className?: string;
}

export function ChecklistItemCompletion({ item, className }: ChecklistItemCompletionProperties) {
  return (
    <>
      {item.isCompleted && item.completedBy && item.completedAt && (
        <p className={cn('wrap-anywhere col-span-2 text-muted-foreground text-xs leading-normal', className)}>
          {item.completedBy.fullName} · <time dateTime={item.completedAt}>{formatDateTime(item.completedAt)}</time>
        </p>
      )}
    </>
  );
}
