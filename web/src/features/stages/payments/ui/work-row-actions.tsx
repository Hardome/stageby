import { BanknoteIcon, PencilIcon, SplitIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@shared/ui/button';

import type { WorkPlanRow } from '@api/types';

import type { WorkAction } from '../model/types';

interface WorkRowActionsProperties {
  row: WorkPlanRow;
  hasPayments: boolean;
  onAction: (action: WorkAction) => void;
}

export function WorkRowActions({ row, hasPayments, onAction }: WorkRowActionsProperties) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t bg-background/60 px-4 py-3 sm:px-5">
      <Button
        size="sm"
        variant="outline"
        disabled={row.recipientId === null}
        onClick={() => onAction({ kind: 'payment', rowId: row.id })}
      >
        <BanknoteIcon data-icon="inline-start" />
        Добавить платёж
      </Button>
      {!hasPayments && row.recipientId === null && (
        <Button size="sm" variant="ghost" onClick={() => onAction({ kind: 'distribute', row })}>
          <SplitIcon data-icon="inline-start" />
          Распределить
        </Button>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Изменить строку"
          title="Изменить строку"
          onClick={() => onAction({ kind: 'row', row })}
        >
          <PencilIcon />
        </Button>
        {!hasPayments && (
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Удалить строку"
            title="Удалить строку"
            onClick={() => onAction({ kind: 'delete-row', row })}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
    </div>
  );
}
