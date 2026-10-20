import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoiceShortages } from '../lib/use-invoice-shortages';
import { InvoiceShortageForm } from './invoice-shortage-form';
import { MaterialDialog } from './material-dialog';

interface InvoiceShortageDialogProperties {
  stage: Stage;
  invoice: StageMaterialInvoice;
  onClose: () => void;
}

export function InvoiceShortageDialog({ stage, invoice, onClose }: InvoiceShortageDialogProperties) {
  const editor = useInvoiceShortages(stage, invoice, onClose);

  return (
    <MaterialDialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      pending={editor.action.pending}
      title="Сообщить о нехватке"
      trigger={null}
    >
      <InvoiceShortageForm editor={editor} onClose={onClose} />
    </MaterialDialog>
  );
}
