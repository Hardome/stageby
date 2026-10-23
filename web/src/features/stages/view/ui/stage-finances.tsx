import { PackageIcon, WalletIcon } from 'lucide-react';

import { formatMoney } from '@entities/project';
import { MaterialStatus } from '@entities/stage';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

import type { Stage } from '@api/types';

interface StageFinancesProperties {
  stage: Stage;
  category: 'materials' | 'work';
}

export function StageFinances({ stage, category }: Readonly<StageFinancesProperties>) {
  const isMaterials = category === 'materials';
  const plan = isMaterials ? stage.plannedMaterialAmountMinor : stage.plannedWorkAmountMinor;
  const actual = isMaterials ? stage.actualMaterialAmountMinor : stage.actualWorkAmountMinor;
  const materialBalance = plan === null ? null : plan - actual;
  const balance = isMaterials ? materialBalance : stage.workBalanceAmountMinor;

  return (
    <Card id={isMaterials ? 'materials' : 'work-summary'} className="scroll-mt-6">
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
          <p className="mb-2 text-xs text-muted-foreground">Фактические затраты</p>
          <p className="text-3xl font-bold tracking-tight wrap-anywhere tabular-nums">{formatMoney(actual)}</p>
        </div>
        {isMaterials && <MaterialStatus summary={stage.materialSummary} />}
      </CardContent>
      <CardFooter className="bg-background text-foreground">
        <dl className="grid w-full grid-cols-2 gap-4">
          <div>
            <dt className="mb-1 text-xs text-muted-foreground">План</dt>
            <dd className="font-semibold wrap-anywhere tabular-nums">{formatMoney(plan)}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs text-muted-foreground">
              {balance !== null && balance < 0n ? 'Переплата' : 'Остаток'}
            </dt>
            <dd className="font-semibold wrap-anywhere tabular-nums">
              {formatMoney(balance !== null && balance < 0n ? -balance : balance)}
            </dd>
          </div>
        </dl>
      </CardFooter>
    </Card>
  );
}
