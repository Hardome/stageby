import { cn } from 'cn';
import { ArrowDownLeftIcon, CircleCheckIcon, WalletIcon } from 'lucide-react';

import { formatMoney } from '@entities/project';
import { Badge } from '@shared/ui/badge';

import type { Stage } from '@api/types';

export function WorkFinancialOverview({ stage }: { stage: Stage }) {
  const balance = stage.workBalanceAmountMinor;
  const isOverpaid = balance !== null && balance < 0n;
  const balanceAmount = isOverpaid ? -balance : balance;
  const plan = stage.plannedWorkAmountMinor;
  const percent = plan !== null && plan > 0n ? Math.min(100, Number((stage.actualWorkAmountMinor * 100n) / plan)) : 0;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-surface-inverse-border',
        'bg-surface-inverse text-surface-inverse-foreground',
      )}
      aria-label="Итоги оплаты этапа"
    >
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-surface-inverse-muted">
              <WalletIcon className="size-4" aria-hidden="true" />
              {isOverpaid ? 'Переплата по этапу' : 'Осталось выплатить'}
            </span>
            {stage.status === 'paid' && (
              <Badge variant="success">
                <CircleCheckIcon aria-hidden="true" /> Выплачен
              </Badge>
            )}
          </div>
          <p className="wrap-anywhere font-bold text-4xl tabular-nums tracking-tight sm:text-5xl">
            {balance === null ? <span className="text-2xl">Не рассчитан</span> : formatMoney(balanceAmount)}
          </p>
          <p className="text-surface-inverse-muted text-xs leading-relaxed">
            {isOverpaid
              ? 'Фактические выплаты превысили ручной план работ.'
              : 'По ручному плану работ и всем платежам этапа.'}
          </p>
        </div>
        <div
          className={cn(
            'flex min-w-0 flex-col justify-center gap-5 border-surface-inverse-border border-t pt-5',
            'lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8',
          )}
        >
          <dl className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <dt className="mb-2 text-surface-inverse-muted text-xs">План работ этапа</dt>
              <dd className="wrap-anywhere font-semibold text-xl tabular-nums">{formatMoney(plan)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="mb-2 flex items-center gap-1.5 text-surface-inverse-muted text-xs">
                <ArrowDownLeftIcon className="size-3.5" aria-hidden="true" /> Выплачено
              </dt>
              <dd className="wrap-anywhere font-semibold text-xl tabular-nums">
                {formatMoney(stage.actualWorkAmountMinor)}
              </dd>
            </div>
          </dl>
          {plan !== null && plan > 0n && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between gap-3 text-surface-inverse-muted text-xs">
                <span>Оплачено по плану</span>
                <span className="font-semibold tabular-nums">{percent}%</span>
              </div>
              <progress
                value={percent}
                max={100}
                aria-label="Оплачено по плану"
                className={cn(
                  'h-1.5 w-full appearance-none overflow-hidden rounded-full bg-surface-inverse-accent',
                  '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-inverse-accent',
                  '[&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary',
                )}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
