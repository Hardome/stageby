import { useId } from 'react';

import { Controller } from 'react-hook-form';

import { Button } from '@shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Input } from '@shared/ui/input';
import { MoneyInput } from '@shared/ui/money-input';
import { Spinner } from '@shared/ui/spinner';
import { Uploader } from '@shared/ui/uploader';

import { invoiceFileError, maxInvoiceSize } from '../lib/material-form';
import type { useInvoiceEditor } from '../lib/use-invoice-editor';
import { InvoiceFile } from './invoice-file';
import { MaterialFeedback } from './material-feedback';

interface InvoiceEditFormProperties {
  editor: ReturnType<typeof useInvoiceEditor>;
  fileId: number;
  onClose: () => void;
}

export function InvoiceEditForm({ editor, fileId, onClose }: InvoiceEditFormProperties) {
  const id = useId();
  const { form, upload, action, submit } = editor;
  const errors = form.formState.errors;
  return (
    <form onSubmit={(event) => void form.handleSubmit(submit)(event)} className="flex flex-col gap-4">
      <FieldGroup>
        <div className="flex items-center justify-between gap-2 text-sm">
          Текущий файл <InvoiceFile fileId={fileId} />
        </div>
        <Uploader
          items={upload.items}
          label="Заменить файл счёта (необязательно)"
          multiple={false}
          accept={{ 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'] }}
          maxSize={maxInvoiceSize}
          validateFile={invoiceFileError}
          disabled={action.blocked}
          error={upload.error}
          onSelect={(files) => {
            if (upload.items.length === 0) upload.select(files.slice(0, 1));
            else upload.setError('Уберите выбранный файл перед заменой.');
          }}
          onReject={upload.setError}
          onRetry={(item) => void upload.retry(item)}
          onRemove={upload.remove}
          compact
        />
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
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" disabled={action.pending} onClick={onClose}>
          Закрыть
        </Button>
        <Button type="submit" disabled={action.blocked || upload.items.some((item) => item.status !== 'uploaded')}>
          {action.pending && <Spinner data-icon="inline-start" />}Сохранить счёт
        </Button>
      </div>
    </form>
  );
}
