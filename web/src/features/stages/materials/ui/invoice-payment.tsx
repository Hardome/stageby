import { useState } from 'react';

import { WalletIcon } from 'lucide-react';

import { formatDate, formatMoney } from '@entities/project';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { DialogTrigger } from '@shared/ui/dialog';

import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoicePayment } from '../lib/use-invoice-payment';
import { InvoicePaymentForm } from './invoice-payment-form';
import { MaterialDialog } from './material-dialog';

export function InvoicePayment({
  stage,
  invoice,
  canManage,
}: {
  stage: Stage;
  invoice: StageMaterialInvoice;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const editor = useInvoicePayment(stage, invoice, () => setOpen(false));
  const isPaid = invoice.paidAt !== null;

  return (
    <section className="flex h-full min-w-0 flex-col gap-3 rounded-xl bg-background p-4" aria-label="Оплата счёта">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold text-sm">
          <WalletIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          Оплата
        </h4>
        <Badge variant={isPaid ? 'success' : 'caution'}>{isPaid ? 'Оплата отмечена' : 'Не оплачен'}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="wrap-anywhere font-bold text-xl tabular-nums">
          {isPaid ? formatMoney(invoice.paidAmountMinor) : 'Ожидает оплаты'}
        </p>
        <p className="text-muted-foreground text-sm">
          {invoice.paidDate ? `Оплачено ${formatDate(invoice.paidDate)}` : 'Сумма и дата оплаты пока не указаны'}
        </p>
      </div>
      {canManage && (
        <MaterialDialog
          isOpen={open}
          onOpenChange={setOpen}
          pending={editor.action.pending}
          title={isPaid ? 'Изменить оплату счёта' : 'Внести оплату счёта'}
          description={`Счёт на ${formatMoney(invoice.amountMinor)}. Укажите фактическую сумму и дату оплаты.`}
          trigger={
            <DialogTrigger
              render={
                <Button
                  className="self-start"
                  variant={isPaid ? 'outline' : 'default'}
                  disabled={editor.action.pending}
                />
              }
            >
              {isPaid ? 'Изменить оплату' : 'Внести оплату'}
            </DialogTrigger>
          }
        >
          <InvoicePaymentForm editor={editor} isPaid={isPaid} onClose={() => setOpen(false)} />
        </MaterialDialog>
      )}
    </section>
  );
}
