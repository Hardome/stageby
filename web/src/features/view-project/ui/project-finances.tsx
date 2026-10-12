import { WalletIcon } from 'lucide-react';

import { formatMoney } from '@entities/project';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';

import type { ProjectFinancialSummary } from '@api/types';

interface ProjectFinancesProperties {
  finances: ProjectFinancialSummary;
}

export function ProjectFinances({ finances }: ProjectFinancesProperties) {
  const rows = [
    { label: 'Работы', plan: finances.plannedWorkAmountMinor, actual: finances.actualWorkAmountMinor },
    { label: 'Материалы', plan: finances.plannedMaterialAmountMinor, actual: finances.actualMaterialAmountMinor },
  ];
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <WalletIcon className="size-5 text-primary-text" aria-hidden="true" />
              Финансы объекта
            </h2>
          </CardTitle>
          {!finances.isPlanComplete && <Badge variant="outline">План заполнен не полностью</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div className="min-w-0">
            <p className="mb-2 text-muted-foreground text-xs">Фактические затраты · итого</p>
            <p className="wrap-anywhere font-bold text-3xl tabular-nums tracking-tight sm:text-4xl">
              {formatMoney(finances.totalActualAmountMinor)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border bg-background p-4 text-foreground">
            <p className="mb-1 text-muted-foreground text-xs">Общий план</p>
            <p className="wrap-anywhere font-semibold text-xl tabular-nums">
              {formatMoney(finances.totalPlannedAmountMinor)}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-4 border-t pt-5 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="mb-2 font-medium text-muted-foreground text-sm">{row.label}</dt>
              <dd className="wrap-anywhere font-semibold text-lg tabular-nums">Факт: {formatMoney(row.actual)}</dd>
              <dd className="wrap-anywhere mt-1 text-muted-foreground text-sm tabular-nums">
                План: {formatMoney(row.plan)}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
