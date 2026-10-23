import { formatMoney } from '@entities/project';
import { Button } from '@shared/ui/button';
import { DialogBody, DialogFooter } from '@shared/ui/dialog';
import { Spinner } from '@shared/ui/spinner';

import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoiceEditor } from '../lib/use-invoice-editor';
import { InvoiceEditForm } from './invoice-edit-form';
import { MaterialDialog } from './material-dialog';
import { MaterialFeedback } from './material-feedback';

interface InvoiceEditorProperties {
  stage: Stage;
  invoice: StageMaterialInvoice;
  kind: 'edit' | 'delete';
  onClose: () => void;
}

export function InvoiceEditor({ stage, invoice, kind, onClose }: Readonly<InvoiceEditorProperties>) {
  const editor = useInvoiceEditor(stage, invoice, onClose);
  const { action } = editor;
  const isDelete = kind === 'delete';
  return (
    <MaterialDialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      pending={action.pending}
      title={isDelete ? 'Удалить счёт?' : 'Изменить счёт'}
      description={
        isDelete ? `${formatMoney(invoice.amountMinor)} · ${invoice.supplierName ?? 'Поставщик не указан'}` : undefined
      }
      trigger={null}
    >
      {isDelete ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <DialogBody>
            <p className="text-sm">
              Счёт и все его нехватки будут удалены.
              <br />
              Оплата счёта будет исключена из финансовых итогов. Это действие нельзя отменить.
            </p>
            <MaterialFeedback action={action} />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={action.pending} onClick={onClose}>
              Отмена
            </Button>
            <Button variant="destructive" disabled={action.blocked} onClick={() => void editor.remove()}>
              {action.pending && <Spinner data-icon="inline-start" />}Удалить счёт
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <InvoiceEditForm editor={editor} fileId={invoice.fileId} onClose={onClose} />
      )}
    </MaterialDialog>
  );
}
