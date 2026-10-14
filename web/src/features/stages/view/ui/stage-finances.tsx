import { PackageIcon, WalletIcon } from 'lucide-react';

import { formatMoney, materialDescription } from '@entities/project';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

import type { Stage } from '@api/types';

interface StageFinancesProperties {
  stage: Stage;
  category: 'materials' | 'work';
}

export function StageFinances({ stage, category }: StageFinancesProperties) {
  const isMaterials = category === 'materials';
  const plan = isMaterials ? stage.plannedMaterialAmountMinor : stage.plannedWorkAmountMinor;
  const actual = isMaterials ? stage.actualMaterialAmountMinor : stage.actualWorkAmountMinor;
  const materialBalance = plan === null ? null : plan - actual;
  const balance = isMaterials ? materialBalance : stage.workBalanceAmountMinor;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            {isMaterials ? (
              <PackageIcon className="size-5 text-primary-text" aria-hidden="true" />
            ) : (
              <WalletIcon className="size-5 text-primary-text" aria-hidden="true" />
            )}
            {isMaterials ? 'Материалы' : 'Оплата работ'}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-muted-foreground text-xs">Фактические затраты</p>
          <p className="wrap-anywhere font-bold text-3xl tabular-nums tracking-tight">{formatMoney(actual)}</p>
        </div>
        {isMaterials && <p className="text-muted-foreground text-xs">{materialDescription(stage.materialSummary)}</p>}
      </CardContent>
      <CardFooter className="bg-background text-foreground">
        <dl className="grid w-full grid-cols-2 gap-4">
          <div>
            <dt className="mb-1 text-muted-foreground text-xs">План</dt>
            <dd className="wrap-anywhere font-semibold tabular-nums">{formatMoney(plan)}</dd>
          </div>
          <div>
            <dt className="mb-1 text-muted-foreground text-xs">
              {balance !== null && balance < 0n ? 'Переплата' : 'Остаток'}
            </dt>
            <dd className="wrap-anywhere font-semibold tabular-nums">
              {formatMoney(balance !== null && balance < 0n ? -balance : balance)}
            </dd>
          </div>
        </dl>
      </CardFooter>
    </Card>
  );
}
