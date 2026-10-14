import { Button } from '@shared/ui/button';

import { stagePageSize } from '../model/data';

interface StageListPaginationProperties {
  offset: number;
  total: number;
  refreshing: boolean;
  onPageChange: (offset: number) => void;
}

export function StageListPagination({ offset, total, refreshing, onPageChange }: StageListPaginationProperties) {
  return (
    <nav aria-label="Страницы этапов" className="flex flex-wrap items-center justify-between gap-3">
      <Button
        variant="outline"
        disabled={offset === 0 || refreshing}
        onClick={() => onPageChange(Math.max(0, offset - stagePageSize))}
      >
        Назад
      </Button>
      <span className="text-sm">
        Страница {Math.floor(offset / stagePageSize) + 1} из {Math.max(1, Math.ceil(total / stagePageSize))}
      </span>
      <Button
        variant="outline"
        disabled={offset + stagePageSize >= total || refreshing}
        onClick={() => onPageChange(offset + stagePageSize)}
      >
        Далее
      </Button>
    </nav>
  );
}
