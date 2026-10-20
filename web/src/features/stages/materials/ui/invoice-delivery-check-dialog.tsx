import { useState } from 'react';

import { Button } from '@shared/ui/button';
import { DialogBody, DialogFooter } from '@shared/ui/dialog';

import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoiceShortages } from '../lib/use-invoice-shortages';
import { InvoiceShortageForm } from './invoice-shortage-form';
import { MaterialDialog } from './material-dialog';

interface InvoiceDeliveryCheckDialogProperties {
  stage: Stage;
  invoice: StageMaterialInvoice;
  onClose: () => void;
}

export function InvoiceDeliveryCheckDialog({ stage, invoice, onClose }: InvoiceDeliveryCheckDialogProperties) {
  const [hasShortage, setHasShortage] = useState(false);
  const editor = useInvoiceShortages(stage, invoice, onClose);

  return (
    <MaterialDialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      pending={editor.action.pending}
      title={hasShortage ? 'Сообщить о нехватке' : 'Всё ли доехало?'}
      trigger={null}
    >
      {hasShortage ? (
        <InvoiceShortageForm editor={editor} onClose={onClose} />
      ) : (
        <>
          <DialogBody>
            <p className="text-sm">Доставка подтверждена. Все материалы на месте? Нет ли нехватки?</p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHasShortage(true)}>
              Есть нехватка
            </Button>
            <Button type="button" onClick={onClose}>
              Всё в порядке
            </Button>
          </DialogFooter>
        </>
      )}
    </MaterialDialog>
  );
}
