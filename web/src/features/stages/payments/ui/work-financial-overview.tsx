import { formatMoney } from '@entities/project';

import type { Stage } from '@api/types';

interface WorkFinancialOverviewProperties {
  stage: Stage;
}

export function WorkFinancialOverview({ stage }: Readonly<WorkFinancialOverviewProperties>) {
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
        <div key={metric.label} className="min-w-0 border-l-2 border-border pl-3">
          <dt className="mb-1 text-sm text-muted-foreground">{metric.label}</dt>
          <dd className="text-2xl font-bold tracking-tight wrap-anywhere tabular-nums">{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
