import { formatDateTime } from '@shared/lib/format-date-time';

import type { ChecklistItem } from '@api/types';

interface ChecklistItemCompletionProperties {
  item: ChecklistItem;
}

export function ChecklistItemCompletion({ item }: ChecklistItemCompletionProperties) {
  return (
    <>
      {item.isCompleted && item.completedBy && item.completedAt && (
        <p className="wrap-anywhere col-span-2 text-muted-foreground text-xs leading-normal">
          Закрыл: {item.completedBy.fullName} ·{' '}
          <time dateTime={item.completedAt}>{formatDateTime(item.completedAt)}</time>
        </p>
      )}
    </>
  );
}
