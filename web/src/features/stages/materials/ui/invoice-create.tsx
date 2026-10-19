import { useId, useState } from 'react';

import { PlusIcon } from 'lucide-react';
import { Controller } from 'react-hook-form';

import { Button } from '@shared/ui/button';
import { DialogBody, DialogFooter, DialogTrigger } from '@shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Input } from '@shared/ui/input';
import { MoneyInput } from '@shared/ui/money-input';
import { Spinner } from '@shared/ui/spinner';
import { Uploader } from '@shared/ui/uploader';

import type { Stage } from '@api/types';

import { invoiceFileError, maxInvoiceSize } from '../lib/material-form';
import { useInvoiceCreate } from '../lib/use-invoice-create';
import { MaterialDialog } from './material-dialog';
import { MaterialFeedback } from './material-feedback';

interface InvoiceCreateProperties {
  stage: Stage;
  count: number;
}

export function InvoiceCreate({ stage, count }: InvoiceCreateProperties) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { form, upload, action, submit, locked } = useInvoiceCreate(stage, () => setOpen(false));
  const isDisabled = action.blocked || locked;
  const isLimitReached = count >= 10;
  const errors = form.formState.errors;

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) return;

    form.clearErrors();
    upload.setError('');
  }

  return (
    <MaterialDialog
      isOpen={open}
      onOpenChange={handleOpenChange}
      pending={action.pending}
      title="Новый счёт на материалы"
      trigger={
        <DialogTrigger render={<Button disabled={action.pending || (isLimitReached && !locked)} />}>
          <PlusIcon data-icon="inline-start" />
          Добавить счёт
        </DialogTrigger>
      }
    >
      <form
        onSubmit={(event) => {
          const file = upload.items[0];
          if (!file) upload.setError('Прикрепите файл счёта.');
          else if (file.status !== 'uploaded') upload.setError('Дождитесь успешной загрузки файла счёта.');
          void form.handleSubmit(submit)(event);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <DialogBody>
          <FieldGroup>
            <Uploader
              items={upload.items}
              label="Файл счёта"
              hideDropzone={upload.items[0]?.status === 'uploaded'}
              dropzoneText="Прикрепите PDF или JPEG до 10 МиБ."
              multiple={false}
              accept={{ 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'] }}
              maxSize={maxInvoiceSize}
              validateFile={invoiceFileError}
              disabled={isDisabled || isLimitReached}
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
                    placeholder="Укажите сумму"
                    disabled={isDisabled || isLimitReached}
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
                placeholder="Укажите поставщика"
                disabled={isDisabled || isLimitReached}
                maxLength={255}
                aria-invalid={Boolean(errors.supplier)}
                aria-describedby={errors.supplier ? `${id}-supplier-error` : undefined}
              />
              {errors.supplier && <FieldError id={`${id}-supplier-error`}>{errors.supplier.message}</FieldError>}
            </Field>
          </FieldGroup>
          {locked && (
            <p className="text-muted-foreground text-sm">Повтор отправит тот же счёт с прежними реквизитами.</p>
          )}
          <MaterialFeedback action={action} />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={action.pending} onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button type="submit" disabled={action.blocked || (!locked && isLimitReached)}>
            {action.pending && <Spinner data-icon="inline-start" />}
            {locked ? 'Повторить создание' : 'Добавить счёт'}
          </Button>
        </DialogFooter>
      </form>
    </MaterialDialog>
  );
}
