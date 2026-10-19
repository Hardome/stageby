import { formatMoney } from '@entities/project';

import type { Stage } from '@api/types';

interface WorkFinancialOverviewProperties {
  stage: Stage;
}

export function WorkFinancialOverview({ stage }: WorkFinancialOverviewProperties) {
  const balance = stage.workBalanceAmountMinor;
  const isOverpaid = balance !== null && balance < 0n;
  const balanceAmount = isOverpaid ? -balance : balance;
  const metrics = [
    { label: 'План', value: formatMoney(stage.plannedWorkAmountMinor) },
    { label: 'Факт', value: formatMoney(stage.actualWorkAmountMinor) },
    {
      label: isOverpaid ? 'Переплата' : 'Остаток',
      value: balanceAmount === null ? 'Не рассчитан' : formatMoney(balanceAmount),
    },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-3" aria-label="Итоги оплаты этапа">
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0 border-border border-l-2 pl-3">
          <dt className="mb-1 text-muted-foreground text-sm">{metric.label}</dt>
          <dd className="wrap-anywhere font-bold text-2xl tabular-nums tracking-tight">{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
