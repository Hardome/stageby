import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoicePayment } from '../lib/use-invoice-payment';
import { InvoicePaymentForm } from './invoice-payment-form';
import { MaterialDialog } from './material-dialog';

interface InvoicePaymentDialogProperties {
  stage: Stage;
  invoice: StageMaterialInvoice;
  onClose: () => void;
}

export function InvoicePaymentDialog({ stage, invoice, onClose }: Readonly<InvoicePaymentDialogProperties>) {
  const editor = useInvoicePayment(stage, invoice, onClose);
  const isPaid = invoice.paidAt !== null;

  return (
    <MaterialDialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      pending={editor.action.pending}
      title={isPaid ? 'Изменить оплату счёта' : 'Внести оплату счёта'}
      trigger={null}
    >
      <InvoicePaymentForm editor={editor} isPaid={isPaid} onClose={onClose} />
    </MaterialDialog>
  );
}
