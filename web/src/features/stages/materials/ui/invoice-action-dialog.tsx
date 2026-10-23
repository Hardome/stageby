import type { Stage, StageMaterialInvoice } from '@api/types';

import { InvoiceDeliveryCheckDialog } from './invoice-delivery-check-dialog';
import { InvoiceEditor } from './invoice-editor';
import { InvoicePaymentDialog } from './invoice-payment-dialog';
import { InvoiceShortageDialog } from './invoice-shortage-dialog';

interface InvoiceActionDialogProperties {
  stage: Stage;
  invoice: StageMaterialInvoice;
  kind: 'edit' | 'delete' | 'payment' | 'shortage' | 'delivery-check';
  onClose: () => void;
}

export function InvoiceActionDialog({ stage, invoice, kind, onClose }: Readonly<InvoiceActionDialogProperties>) {
  if (kind === 'delivery-check')
    return <InvoiceDeliveryCheckDialog stage={stage} invoice={invoice} onClose={onClose} />;
  if (kind === 'payment') return <InvoicePaymentDialog stage={stage} invoice={invoice} onClose={onClose} />;
  return kind === 'shortage' ? (
    <InvoiceShortageDialog stage={stage} invoice={invoice} onClose={onClose} />
  ) : (
    <InvoiceEditor stage={stage} invoice={invoice} kind={kind} onClose={onClose} />
  );
}
