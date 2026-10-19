import { PackageIcon } from 'lucide-react';

import { formatMoney } from '@entities/project';
import { MaterialStatus } from '@entities/stage';
import { useAuth } from '@shared/context';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';

import type { Stage } from '@api/types';

interface MaterialsOverviewProperties {
  stage: Stage;
}

export function MaterialsOverview({ stage }: MaterialsOverviewProperties) {
  const { user } = useAuth();
  const balance =
    stage.plannedMaterialAmountMinor === null
      ? null
      : stage.plannedMaterialAmountMinor - stage.actualMaterialAmountMinor;
  const isOverpaid = balance !== null && balance < 0n;
  const remaining = isOverpaid ? -balance : balance;
  const metrics = [
    { label: 'План', value: formatMoney(stage.plannedMaterialAmountMinor) },
    { label: 'Факт', value: formatMoney(stage.actualMaterialAmountMinor) },
    {
      label: isOverpaid ? 'Переплата' : 'Остаток',
      value: remaining === null ? 'Не рассчитан' : formatMoney(remaining),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <PackageIcon className="size-5 text-primary-text" aria-hidden="true" />
            Материалы
          </h2>
        </CardTitle>
        <MaterialStatus summary={stage.materialSummary} />
      </CardHeader>
      {user?.role !== 'foreman' && (
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
      )}
    </Card>
  );
}
