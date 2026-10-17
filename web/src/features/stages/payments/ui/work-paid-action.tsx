import { CircleCheckIcon, LockKeyholeIcon, ShieldCheckIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
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
      <Alert variant="success">
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle>Расчёт по этапу завершён</AlertTitle>
        <AlertDescription>
          Этап выплачен. Изменения платежей допустимы, пока задан план работ и остаток не больше нуля.
        </AlertDescription>
      </Alert>
    );

  const isAvailable = canConfirmPaid(stage);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Alert variant={isAvailable ? 'success' : 'default'}>
        <ShieldCheckIcon aria-hidden="true" />
        <AlertTitle>{isAvailable ? 'Всё готово для завершения расчёта' : 'Завершение расчёта'}</AlertTitle>
        <AlertDescription>
          {isAvailable
            ? 'Этап принят, выплаты покрывают план. Подтвердите итоговый статус.'
            : 'Подтверждение доступно после приёмки, при заданном плане работ и остатке не больше нуля.'}
        </AlertDescription>
      </Alert>
      <Button variant={isAvailable ? 'success' : 'outline'} disabled={!isAvailable || disabled} onClick={onConfirm}>
        {isAvailable ? <CircleCheckIcon data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}
        Подтвердить «Выплачен»
      </Button>
    </div>
  );
}
