import { PlusIcon } from 'lucide-react';

import { formatMoney } from '@entities/project';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';

interface WorkPlanToolbarProperties {
  total: bigint;
  count: number;
  manager: boolean;
  editable: boolean;
  onCreate: () => void;
}

export function WorkPlanToolbar({ total, count, manager, editable, onCreate }: WorkPlanToolbarProperties) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="flex items-center gap-2 font-bold text-lg">
          {manager ? 'План выплат' : 'Мои строки плана'}
          <Badge variant="secondary">{count}</Badge>
        </h3>
        <p className="wrap-anywhere text-muted-foreground text-xs">
          {manager ? 'Итог строк планирования выплат' : 'План доступных мне строк'}:{' '}
          <span className="font-semibold text-foreground tabular-nums">{formatMoney(total)}</span>
          {manager && <span> · По получателям и срокам</span>}
        </p>
      </div>
      {editable && (
        <Button className="self-start" onClick={onCreate}>
          <PlusIcon data-icon="inline-start" />
          Добавить строку
        </Button>
      )}
    </div>
  );
}
