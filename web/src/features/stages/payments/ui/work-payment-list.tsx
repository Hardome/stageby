import { cn } from 'cn';
import { ArrowDownLeftIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { formatDate, formatMoney } from '@entities/project';
import { Button } from '@shared/ui/button';

import type { WorkPayment } from '@api/types';

import type { WorkAction } from '../model/types';

interface WorkPaymentListProperties {
  payments: WorkPayment[];
  editable: boolean;
  showComments: boolean;
  onAction: (action: WorkAction) => void;
}

export function WorkPaymentList({ payments, editable, showComments, onAction }: WorkPaymentListProperties) {
  return (
    <ul className="flex flex-col divide-y">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className={cn(
            'grid min-w-0 grid-cols-[auto_1fr] gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0',
            'sm:grid-cols-[auto_minmax(0,1fr)_auto]',
          )}
        >
          <div className="flex size-9 items-center justify-center rounded-full border bg-background text-primary-text">
            <ArrowDownLeftIcon className="size-4" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="wrap-anywhere font-bold text-sm tabular-nums">{formatMoney(payment.amountMinor)}</p>
            <p className="wrap-anywhere text-muted-foreground text-xs">
              {payment.recipient.fullName} ·{' '}
              <time dateTime={payment.paidAt} className="tabular-nums">
                {formatDate(payment.paidAt)}
              </time>
            </p>
            {showComments && payment.comment && (
              <p className="wrap-anywhere mt-1 whitespace-pre-wrap text-sm leading-relaxed">{payment.comment}</p>
            )}
          </div>
          {editable && (
            <div className="col-start-2 flex items-start gap-1 sm:col-start-3 sm:row-start-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Изменить платёж"
                title="Изменить платёж"
                onClick={() => onAction({ kind: 'payment', payment })}
              >
                <PencilIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Удалить платёж"
                title="Удалить платёж"
                onClick={() => onAction({ kind: 'delete-payment', payment })}
              >
                <Trash2Icon />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
