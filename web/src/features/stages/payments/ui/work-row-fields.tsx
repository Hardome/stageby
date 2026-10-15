import { useId } from 'react';

import { Controller, useFormContext } from 'react-hook-form';

import { AssigneePicker } from '@entities/user';
import { DatePicker } from '@shared/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { MoneyInput } from '@shared/ui/money-input';

import type { WorkFormValues } from '../lib/work-form';

interface WorkRowFieldsProperties {
  disabled: boolean;
  payment?: boolean;
  index?: number;
}

export function WorkRowFields({ disabled, payment = false, index }: WorkRowFieldsProperties) {
  const id = useId();
  const { control } = useFormContext<WorkFormValues>();
  const prefix = index === undefined ? ('' as const) : (`rows.${index}.` as const);

  return (
    <FieldGroup>
      <Controller
        name={`${prefix}amount`}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={`${id}-amount`}>{payment ? 'Сумма платежа, ₽' : 'План строки, ₽'}</FieldLabel>
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
      {!payment && (
        <Controller
          name={`${prefix}recipient`}
          control={control}
          render={({ field, fieldState: { error } }) => (
            <AssigneePicker
              {...field}
              id={`${id}-recipient`}
              label="Получатель"
              disabled={disabled}
              error={error?.message}
            />
          )}
        />
      )}
      <Controller
        name={`${prefix}date`}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={`${id}-date`}>{payment ? 'Дата платежа' : 'Срок выплаты (необязательно)'}</FieldLabel>
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
