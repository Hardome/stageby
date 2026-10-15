import { FormProvider } from 'react-hook-form';

import { formatMoney } from '@entities/project';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent } from '@shared/ui/dialog';

import { useWorkEditor } from '../lib/use-work-editor';
import type { WorkEditorProperties } from '../model/types';
import { WorkDistributionFields } from './work-distribution-fields';
import { WorkEditorHeading } from './work-editor-heading';
import { WorkPaymentFields } from './work-payment-fields';
import { WorkRowFields } from './work-row-fields';

const submitLabels = {
  row: 'Сохранить строку',
  payment: 'Сохранить платёж',
  distribute: 'Распределить',
  'delete-row': 'Удалить строку',
  'delete-payment': 'Удалить платёж',
  paid: 'Подтвердить выплату',
};

export function WorkEditor(properties: WorkEditorProperties) {
  const editor = useWorkEditor(properties);
  const { action, stage, onClose } = properties;
  const isDisabled = editor.pending || editor.needsReload || editor.unavailable;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !editor.pending) onClose();
      }}
    >
      <DialogContent>
        <WorkEditorHeading action={action} stage={stage} />
        <FormProvider {...editor.form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => void editor.form.handleSubmit(editor.submit)(event)}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
              {action.kind === 'row' && <WorkRowFields disabled={isDisabled} />}
              {action.kind === 'payment' && <WorkPaymentFields disabled={isDisabled} />}
              {editor.snapshot.kind === 'distribute' && (
                <WorkDistributionFields row={editor.snapshot.row} disabled={isDisabled} />
              )}
              {action.kind === 'delete-payment' && (
                <p>Будет удалён платёж {formatMoney(action.payment.amountMinor)}. Итоги этапа пересчитаются.</p>
              )}
              {action.kind === 'delete-row' && (
                <p>Будет удалена строка на {formatMoney(action.row.amountMinor)} без выплат.</p>
              )}
              {editor.message && (
                <Alert>
                  <AlertDescription role="status">{editor.message}</AlertDescription>
                </Alert>
              )}
              {editor.needsReload && (
                <Button type="button" variant="outline" disabled={editor.pending} onClick={() => void editor.reload()}>
                  Обновить данные, сохранив ввод
                </Button>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t bg-background p-5 sm:px-6">
              <Button type="button" variant="outline" disabled={editor.pending} onClick={onClose}>
                Отмена
              </Button>
              <Button
                type="submit"
                variant={action.kind.startsWith('delete') ? 'destructive' : 'default'}
                disabled={isDisabled}
              >
                {editor.pending ? 'Сохранение…' : submitLabels[action.kind]}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
