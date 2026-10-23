import type { ReactNode } from 'react';

import { cn } from 'cn';
import { FileTextIcon } from 'lucide-react';

import { formatDate, formatMoney } from '@entities/project';
import { Badge } from '@shared/ui/badge';

import type { StageMaterialInvoice } from '@api/types';

import { invoicePaymentStatus } from '../lib/invoice-payment-status';
import { InvoiceFileMenu } from './invoice-file-menu';

interface InvoiceCardProperties {
  invoice: StageMaterialInvoice;
  number: number;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function InvoiceCard({ invoice, number, actions, children, className }: Readonly<InvoiceCardProperties>) {
  const shortages = invoice.shortages.filter((shortage) => !shortage.resolvedAt).length;
  const paymentStatus = invoicePaymentStatus(invoice);

  return (
    <li className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 p-4', className)}>
      <div className="contents">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <FileTextIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-semibold wrap-anywhere">{invoice.supplierName ?? `Счёт №${number}`}</span>
            <span className="text-xs text-muted-foreground">
              {invoice.supplierName && `Счёт №${number} · `}
              {formatDate(invoice.createdAt.slice(0, 10))}
            </span>
          </span>
          <span className="shrink-0 text-base font-bold tabular-nums">{formatMoney(invoice.amountMinor)}</span>
        </div>
        {actions || <InvoiceFileMenu fileId={invoice.fileId} />}
      </div>
      <div className="col-start-1 flex min-w-0 flex-wrap items-center gap-2 sm:pl-8">
        <Badge variant={paymentStatus.variant}>{paymentStatus.label}</Badge>
        <Badge variant={invoice.deliveredAt ? 'success' : 'secondary'}>
          {invoice.deliveredAt ? 'Доставлен' : 'Не доставлен'}
        </Badge>
        {shortages > 0 && <Badge variant="warning">Нехватки: {shortages}</Badge>}
      </div>
      {children && <div className="col-span-full sm:ml-8">{children}</div>}
    </li>
  );
}
