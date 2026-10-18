import { FormProvider } from 'react-hook-form';

import { formatMoney } from '@entities/project';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent } from '@shared/ui/dialog';

import { useWorkEditor } from '../lib/use-work-editor';
import type { WorkEditorProperties } from '../model/types';
import { WorkEditorHeading } from './work-editor-heading';
import { WorkPaymentFields } from './work-payment-fields';

const submitLabels = { payment: 'Сохранить платёж', 'delete-payment': 'Удалить платёж' };

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
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-4">
              {action.kind === 'payment' && (
                <>
                  <p className="text-sm">
                    Получатель: {action.payment?.recipient.fullName ?? stage.assignee?.fullName ?? 'Мастер не назначен'}
                  </p>
                  <WorkPaymentFields disabled={isDisabled} />
                </>
              )}
              {action.kind === 'delete-payment' && (
                <p>Будет удалён платёж {formatMoney(action.payment.amountMinor)}. Итоги этапа пересчитаются.</p>
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
            <div className="flex shrink-0 justify-end gap-3 border-t bg-background p-4 sm:px-5">
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
