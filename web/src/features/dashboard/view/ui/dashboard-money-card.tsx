import { BanknoteIcon, PackageIcon } from 'lucide-react';

import { formatMoney } from '@entities/project';

import type { DashboardMoneyMetric } from '@api/types';

interface DashboardMoneyCardProperties {
  title: string;
  metric: DashboardMoneyMetric;
}

export function DashboardMoneyCard({ title, metric }: DashboardMoneyCardProperties) {
  const balance = metric.balanceAmountMinor;
  const isOverpaid = balance !== null && balance < 0n;
  const balanceAmount = isOverpaid ? -balance : balance;
  const Icon = title === 'Работы' ? BanknoteIcon : PackageIcon;

  return (
    <section className="flex min-w-0 flex-col gap-4 p-5 last:border-t sm:p-6 sm:last:border-t-0 sm:last:border-l">
      <h4 className="flex items-center gap-2 font-semibold text-sm">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {title}
      </h4>
      <dl className="grid grid-cols-3 gap-3 text-sm tabular-nums">
        <div className="min-w-0">
          <dt className="mb-1.5 text-muted-foreground text-xs">План</dt>
          <dd className="wrap-anywhere">{formatMoney(metric.plannedAmountMinor)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="mb-1.5 text-muted-foreground text-xs">Факт</dt>
          <dd className="wrap-anywhere">{formatMoney(metric.actualAmountMinor)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="mb-1.5 text-muted-foreground text-xs">{isOverpaid ? 'Переплата' : 'Остаток'}</dt>
          <dd className="wrap-anywhere font-semibold">
            {balance === null ? 'Не рассчитан' : formatMoney(balanceAmount)}
          </dd>
        </div>
      </dl>
      {!metric.isPlanComplete && <p className="text-muted-foreground text-xs">План неполон</p>}
    </section>
  );
}
