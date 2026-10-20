import { FormProvider } from 'react-hook-form';

import { formatMoney } from '@entities/project';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@shared/ui/dialog';

import { useWorkEditor } from '../lib/use-work-editor';
import type { WorkEditorProperties } from '../model/types';
import { WorkEditorHeading } from './work-editor-heading';
import { WorkPaymentFields } from './work-payment-fields';

const submitLabels = { payment: 'Добавить', 'delete-payment': 'Удалить платёж' };

export function WorkEditor(properties: WorkEditorProperties) {
  const editor = useWorkEditor(properties);
  const { action, stage, onClose } = properties;
  const isDisabled = editor.pending || editor.needsReload || editor.unavailable;
  const submitLabel = action.kind === 'payment' && action.payment ? 'Сохранить' : submitLabels[action.kind];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !editor.pending) onClose();
      }}
    >
      <DialogContent>
        <WorkEditorHeading action={action} stage={stage} pending={editor.pending} />
        <FormProvider {...editor.form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => void editor.form.handleSubmit(editor.submit)(event)}
          >
            <DialogBody>
              {action.kind === 'payment' && <WorkPaymentFields disabled={isDisabled} />}
              {action.kind === 'delete-payment' && (
                <p>Будет удалена выплата {formatMoney(action.payment.amountMinor)}. Итоги этапа пересчитаются.</p>
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
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={editor.pending} onClick={onClose}>
                Отмена
              </Button>
              <Button
                type="submit"
                variant={action.kind.startsWith('delete') ? 'destructive' : 'default'}
                disabled={isDisabled}
              >
                {editor.pending ? 'Сохранение…' : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
