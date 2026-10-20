import type { Stage } from '@api/types';

interface WorkPaymentStatus {
  label: string;
  variant: 'success' | 'caution';
}

export function workPaymentStatus(
  stage: Pick<Stage, 'plannedWorkAmountMinor' | 'actualWorkAmountMinor'>,
): WorkPaymentStatus {
  if (stage.plannedWorkAmountMinor !== null && stage.actualWorkAmountMinor >= stage.plannedWorkAmountMinor)
    return { label: 'Оплачено', variant: 'success' };

  return {
    label: stage.actualWorkAmountMinor > 0n ? 'Оплачено частично' : 'Не оплачено',
    variant: 'caution',
  };
}
