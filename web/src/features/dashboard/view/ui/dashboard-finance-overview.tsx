import { formatDate, formatMoney } from '@entities/project';
import { Badge } from '@shared/ui/badge';

import type { DashboardSummary } from '@api/types';

import { DashboardMoneyCard } from './dashboard-money-card';

interface DashboardFinanceOverviewProperties {
  summary: DashboardSummary;
  through: string;
}

export function DashboardFinanceOverview({ summary, through }: Readonly<DashboardFinanceOverviewProperties>) {
  const balance = summary.total.balanceAmountMinor;
  const isOverpaid = balance !== null && balance < 0n;
  const balanceAmount = isOverpaid ? -balance : balance;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border bg-card text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-4">
        <h3 className="font-semibold">Общий итог</h3>
        <span className="text-xs text-muted-foreground">К {formatDate(through)}</span>
      </div>
      <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-[1.4fr_1fr_1fr] sm:p-4">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <dt className="mb-2 text-xs text-muted-foreground">{isOverpaid ? 'Переплата' : 'Остаток к оплате'}</dt>
          <dd className="text-4xl font-semibold tracking-tight wrap-anywhere tabular-nums">
            {balance === null ? 'Не рассчитан' : formatMoney(balanceAmount)}
          </dd>
        </div>
        <div className="min-w-0 sm:border-l sm:pl-5">
          <dt className="mb-2 text-xs text-muted-foreground">План к дате</dt>
          <dd className="text-xl font-semibold wrap-anywhere tabular-nums">
            {formatMoney(summary.total.plannedAmountMinor)}
          </dd>
        </div>
        <div className="min-w-0 sm:border-l sm:pl-5">
          <dt className="mb-2 text-xs text-muted-foreground">Факт</dt>
          <dd className="text-xl font-semibold wrap-anywhere tabular-nums">
            {formatMoney(summary.total.actualAmountMinor)}
          </dd>
        </div>
      </dl>
      {!summary.total.isPlanComplete && (
        <div className="px-4 pb-5 sm:px-5">
          <Badge variant="outline">План неполон</Badge>
        </div>
      )}
      <div className="grid border-t sm:grid-cols-2">
        <DashboardMoneyCard title="Работы" metric={summary.works} />
        <DashboardMoneyCard title="Материалы" metric={summary.materials} />
      </div>
    </div>
  );
}
