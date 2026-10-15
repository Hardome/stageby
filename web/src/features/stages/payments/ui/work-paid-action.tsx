import { cn } from 'cn';
import { CircleCheckIcon, LockKeyholeIcon, ShieldCheckIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

import type { Stage } from '@api/types';

import { canConfirmPaid } from '../lib/work-availability';

interface WorkPaidActionProperties {
  stage: Stage;
  disabled: boolean;
  onConfirm: () => void;
}

export function WorkPaidAction({ stage, disabled, onConfirm }: WorkPaidActionProperties) {
  if (stage.status === 'paid')
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success-border bg-success-subtle p-4">
        <CircleCheckIcon className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-sm">Расчёт по этапу завершён</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Этап выплачен. Изменения платежей допустимы, пока задан план работ и остаток не больше нуля.
          </p>
        </div>
      </div>
    );

  const isAvailable = canConfirmPaid(stage);

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
        isAvailable ? 'border-success-border bg-success-subtle' : 'bg-background',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-primary-text" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-semibold text-sm">
            {isAvailable ? 'Всё готово для завершения расчёта' : 'Завершение расчёта'}
          </p>
          <p className="max-w-md text-muted-foreground text-xs leading-relaxed">
            {isAvailable
              ? 'Этап принят, выплаты покрывают план. Подтвердите итоговый статус.'
              : 'Подтверждение доступно после приёмки, при заданном плане работ и остатке не больше нуля.'}
          </p>
        </div>
      </div>
      <Button variant={isAvailable ? 'success' : 'outline'} disabled={!isAvailable || disabled} onClick={onConfirm}>
        {isAvailable ? <CircleCheckIcon data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}
        Подтвердить «Выплачен»
      </Button>
    </div>
  );
}
