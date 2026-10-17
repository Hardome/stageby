import { formatMoney } from '@entities/project';
import { Button } from '@shared/ui/button';
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

export function InvoiceEditor({ stage, invoice, kind, onClose }: InvoiceEditorProperties) {
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
      description={`${formatMoney(invoice.amountMinor)} · ${invoice.supplierName ?? 'Поставщик не указан'}`}
      trigger={null}
    >
      {isDelete ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Счёт и все его нехватки будут удалены. Оплата счёта будет исключена из финансовых итогов. Это действие
            нельзя отменить.
          </p>
          <MaterialFeedback action={action} />
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button variant="outline" disabled={action.pending} onClick={onClose}>
              Отмена
            </Button>
            <Button variant="destructive" disabled={action.blocked} onClick={() => void editor.remove()}>
              {action.pending && <Spinner data-icon="inline-start" />}Удалить счёт
            </Button>
          </div>
        </div>
      ) : (
        <InvoiceEditForm editor={editor} fileId={invoice.fileId} onClose={onClose} />
      )}
    </MaterialDialog>
  );
}
