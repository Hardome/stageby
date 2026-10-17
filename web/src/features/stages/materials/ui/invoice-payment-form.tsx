import { useId } from 'react';

import { Controller } from 'react-hook-form';

import { Button } from '@shared/ui/button';
import { DatePicker } from '@shared/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { MoneyInput } from '@shared/ui/money-input';
import { Spinner } from '@shared/ui/spinner';

import type { useInvoicePayment } from '../lib/use-invoice-payment';
import { MaterialFeedback } from './material-feedback';

interface InvoicePaymentFormProperties {
  editor: ReturnType<typeof useInvoicePayment>;
  isPaid: boolean;
  onClose: () => void;
}

export function InvoicePaymentForm({ editor, isPaid, onClose }: InvoicePaymentFormProperties) {
  const id = useId();
  const { form, action, submit, clear, hasChanges } = editor;
  const errors = form.formState.errors;

  return (
    <form onSubmit={(event) => void form.handleSubmit(submit)(event)} className="flex flex-col gap-5">
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={Boolean(errors.amount)}>
          <FieldLabel htmlFor={`${id}-amount`}>Фактически оплачено, ₽</FieldLabel>
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
        <Field data-invalid={Boolean(errors.date)}>
          <FieldLabel htmlFor={`${id}-date`}>Дата оплаты</FieldLabel>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <DatePicker
                {...field}
                id={`${id}-date`}
                disabled={action.blocked}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? `${id}-date-error` : undefined}
              />
            )}
          />
          {errors.date && <FieldError id={`${id}-date-error`}>{errors.date.message}</FieldError>}
        </Field>
      </FieldGroup>
      <MaterialFeedback action={action} />
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" disabled={action.pending} onClick={onClose}>
          Закрыть
        </Button>
        <Button type="submit" disabled={action.blocked || !hasChanges}>
          {action.pending && <Spinner data-icon="inline-start" />}Сохранить оплату
        </Button>
      </div>
      {isPaid && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-muted-foreground text-sm">Отметка внесена ошибочно?</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={action.blocked}
            onClick={() => {
              void clear();
            }}
          >
            Снять оплату
          </Button>
        </div>
      )}
    </form>
  );
}
