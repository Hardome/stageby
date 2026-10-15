import { cn } from 'cn';
import { CalendarDaysIcon, UserRoundIcon } from 'lucide-react';

import { formatDate, formatMoney } from '@entities/project';

import type { WorkPlanRow as PlanRow, WorkPayment } from '@api/types';

import type { WorkAction } from '../model/types';
import { WorkPaymentList } from './work-payment-list';
import { WorkRecipient } from './work-recipient';
import { WorkRowActions } from './work-row-actions';
import { WorkRowStatus } from './work-row-status';

interface WorkPlanRowProperties {
  row: PlanRow;
  payments: WorkPayment[];
  manager: boolean;
  editable: boolean;
  onAction: (action: WorkAction) => void;
}

export function WorkPlanRow({ row, payments, manager, editable, onAction }: WorkPlanRowProperties) {
  const actual = payments.reduce((sum, payment) => sum + payment.amountMinor, 0n);
  const balance = row.amountMinor - actual;

  return (
    <li className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl',
              row.recipientId === null
                ? 'bg-warning-subtle text-warning-foreground'
                : 'bg-secondary text-secondary-foreground',
            )}
          >
            <UserRoundIcon className="size-5" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h4 className="wrap-anywhere font-bold text-sm">
              <WorkRecipient recipientId={row.recipientId} />
            </h4>
            <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
              {row.dueDate ? `До ${formatDate(row.dueDate)}` : 'Срок не задан'}
            </p>
          </div>
        </div>
        {manager && <WorkRowStatus plan={row.amountMinor} actual={actual} />}
      </div>
      <dl className="grid grid-cols-2 gap-4 px-4 py-5 tabular-nums sm:grid-cols-3 sm:px-5">
        <div>
          <dt className="text-muted-foreground text-xs">План строки</dt>
          <dd className="wrap-anywhere mt-1.5 font-semibold text-lg">{formatMoney(row.amountMinor)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">{manager ? 'Фактические платежи' : 'Мои выплаты по строке'}</dt>
          <dd className="wrap-anywhere mt-1.5 font-semibold text-lg">{formatMoney(actual)}</dd>
        </div>
        {manager && (
          <div className="col-span-2 border-t pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
            <dt className="text-muted-foreground text-xs">{balance < 0n ? 'Переплата' : 'Остаток строки'}</dt>
            <dd className={cn('wrap-anywhere mt-1.5 font-bold text-lg', balance <= 0n && 'text-primary-text')}>
              {formatMoney(balance < 0n ? -balance : balance)}
            </dd>
          </div>
        )}
      </dl>
      {payments.length > 0 && (
        <div className="border-t px-4 py-4 sm:px-5">
          <p className="mb-3 font-semibold text-muted-foreground text-xs">История платежей · {payments.length}</p>
          <WorkPaymentList payments={payments} editable={editable} onAction={onAction} />
        </div>
      )}
      {editable && <WorkRowActions row={row} hasPayments={payments.length > 0} onAction={onAction} />}
    </li>
  );
}
