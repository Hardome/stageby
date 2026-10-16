import { formatMoney } from '@entities/project';
import { MaterialStatus } from '@entities/stage';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';

import type { Stage } from '@api/types';

export function MaterialsOverview({ stage }: { stage: Stage }) {
  const balance =
    stage.plannedMaterialAmountMinor === null
      ? null
      : stage.plannedMaterialAmountMinor - stage.actualMaterialAmountMinor;
  const isOverpaid = balance !== null && balance < 0n;
  const remaining = isOverpaid ? -balance : balance;
  const metrics = [
    { label: 'План материалов', value: formatMoney(stage.plannedMaterialAmountMinor) },
    { label: 'Фактически оплачено', value: formatMoney(stage.actualMaterialAmountMinor) },
    {
      label: isOverpaid ? 'Переплата' : 'Остаток по плану',
      value: remaining === null ? 'Не рассчитан' : formatMoney(remaining),
    },
  ];

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>
          <h2>Обзор материалов</h2>
        </CardTitle>
        <MaterialStatus summary={stage.materialSummary} />
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 border-border border-l-2 pl-3">
              <dt className="mb-1 text-muted-foreground text-sm">{metric.label}</dt>
              <dd className="wrap-anywhere font-bold text-2xl tabular-nums tracking-tight">{metric.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
