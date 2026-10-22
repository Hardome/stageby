import { formatMoney } from '@entities/project';

import type { DashboardSelectedStage } from '@api/types';

interface DashboardStageFinancesProperties {
  finances: DashboardSelectedStage['finances'];
  kind: 'materials' | 'assignee';
}

export function DashboardStageFinances({ finances, kind }: DashboardStageFinancesProperties) {
  const plan = kind === 'materials' ? finances.plannedMaterialAmountMinor : finances.plannedWorkAmountMinor;
  const actual = kind === 'materials' ? finances.actualMaterialAmountMinor : finances.actualWorkAmountMinor;

  return (
    <span className="wrap-anywhere text-muted-foreground text-xs tabular-nums">
      План / факт: {formatMoney(plan)} / {formatMoney(actual)}
    </span>
  );
}
