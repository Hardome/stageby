import { useId } from 'react';

import { Controller, useFormContext } from 'react-hook-form';

import { DatePicker } from '@shared/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { MoneyInput } from '@shared/ui/money-input';

import type { WorkFormValues } from '../lib/work-form';

export function WorkAmountFields({ disabled }: { disabled: boolean }) {
  const id = useId();
  const { control } = useFormContext<WorkFormValues>();

  return (
    <FieldGroup>
      <Controller
        name={'amount'}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={`${id}-amount`}>Сумма платежа, ₽</FieldLabel>
            <MoneyInput
              id={`${id}-amount`}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-amount-error` : undefined}
            />
            {error && <FieldError id={`${id}-amount-error`}>{error.message}</FieldError>}
          </Field>
        )}
      />
      <Controller
        name={'date'}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={`${id}-date`}>Дата платежа</FieldLabel>
            <DatePicker
              {...field}
              id={`${id}-date`}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-date-error` : undefined}
            />
            {error && <FieldError id={`${id}-date-error`}>{error.message}</FieldError>}
          </Field>
        )}
      />
    </FieldGroup>
  );
}
