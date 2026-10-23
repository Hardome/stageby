import { useId, useState } from 'react';

import { Controller } from 'react-hook-form';

import type { FileTransfer } from '@shared/lib/file-upload';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DialogBody, DialogFooter } from '@shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Input } from '@shared/ui/input';
import { MoneyInput } from '@shared/ui/money-input';
import { Spinner } from '@shared/ui/spinner';
import type { UploadItemModel } from '@shared/ui/upload-item';
import { Uploader } from '@shared/ui/uploader';

import { invoiceFileError, maxInvoiceSize } from '../lib/material-form';
import type { useInvoiceEditor } from '../lib/use-invoice-editor';
import { useInvoiceFile } from '../lib/use-invoice-file';
import { MaterialFeedback } from './material-feedback';

interface InvoiceEditFormProperties {
  editor: ReturnType<typeof useInvoiceEditor>;
  fileId: number;
  onClose: () => void;
}

export function InvoiceEditForm({ editor, fileId, onClose }: Readonly<InvoiceEditFormProperties>) {
  const id = useId();
  const { form, upload, action, submit } = editor;
  const file = useInvoiceFile(fileId);
  const [removed, setRemoved] = useState(false);
  const hasFile = !removed || upload.items.length > 0;
  const items: (UploadItemModel | FileTransfer)[] = removed
    ? upload.items
    : [
        {
          id: `existing-${fileId}`,
          file: { name: 'Текущий файл счёта' },
          status: 'uploaded',
          onOpen: () => void file.open(),
        },
      ];
  const errors = form.formState.errors;

  return (
    <form
      onSubmit={(event) => {
        if (!hasFile) {
          event.preventDefault();
          upload.setError('Прикрепите файл счёта.');
          return;
        }
        void form.handleSubmit(submit)(event);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <DialogBody>
        <FieldGroup>
          <Uploader
            items={items}
            label="Файл счёта"
            dropzoneText="Нажмите или перетащите файл для замены"
            hideDropzone={hasFile}
            multiple={false}
            accept={{ 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'] }}
            maxSize={maxInvoiceSize}
            validateFile={invoiceFileError}
            disabled={action.blocked || file.pending}
            error={upload.error}
            onSelect={(files) => {
              if (upload.items.length === 0) upload.select(files.slice(0, 1));
              else upload.setError('Уберите выбранный файл перед заменой.');
            }}
            onReject={upload.setError}
            onRetry={(item) => {
              if ('key' in item) void upload.retry(item);
            }}
            onRemove={(itemId) => {
              if (itemId === `existing-${fileId}`) setRemoved(true);
              else upload.remove(itemId);
            }}
            compact
          />
          {file.message && (
            <Alert variant="destructive">
              <AlertDescription>{file.message}</AlertDescription>
            </Alert>
          )}
          <Field data-invalid={Boolean(errors.amount)}>
            <FieldLabel htmlFor={`${id}-amount`}>Сумма счёта, ₽</FieldLabel>
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <MoneyInput
                  {...field}
                  onValueChange={field.onChange}
                  id={`${id}-amount`}
                  disabled={action.blocked}
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? `${id}-amount-error` : undefined}
                />
              )}
            />
            {errors.amount && <FieldError id={`${id}-amount-error`}>{errors.amount.message}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(errors.supplier)}>
            <FieldLabel htmlFor={`${id}-supplier`}>Поставщик (необязательно)</FieldLabel>
            <Input
              {...form.register('supplier')}
              id={`${id}-supplier`}
              maxLength={255}
              disabled={action.blocked}
              aria-invalid={Boolean(errors.supplier)}
              aria-describedby={errors.supplier ? `${id}-supplier-error` : undefined}
            />
            {errors.supplier && <FieldError id={`${id}-supplier-error`}>{errors.supplier.message}</FieldError>}
          </Field>
        </FieldGroup>
        <MaterialFeedback action={action} />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={action.pending} onClick={onClose}>
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={action.blocked || !hasFile || upload.items.some((item) => item.status !== 'uploaded')}
        >
          {action.pending && <Spinner data-icon="inline-start" />}Сохранить счёт
        </Button>
      </DialogFooter>
    </form>
  );
}
