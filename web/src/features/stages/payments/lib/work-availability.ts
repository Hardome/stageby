import type { Stage } from '@api/types';

export function canEditWork(stage: Stage, role?: string) {
  return role === 'manager' && !stage.projectIsArchived && stage.isIncluded;
}

export function canConfirmPaid(stage: Stage) {
  return (
    stage.status === 'completed' &&
    stage.plannedWorkAmountMinor !== null &&
    stage.workBalanceAmountMinor !== null &&
    stage.workBalanceAmountMinor <= 0n
  );
}
