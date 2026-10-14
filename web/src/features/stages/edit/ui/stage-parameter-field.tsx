import { Controller, useFormContext } from 'react-hook-form';

import { DatePicker } from '@shared/ui/date-picker';
import { Field, FieldError, FieldLabel } from '@shared/ui/field';
import { MoneyInput } from '@shared/ui/money-input';

import type { StageFormValues } from '../lib/stage-form';

interface StageParameterFieldProperties {
  name: Exclude<keyof StageFormValues, 'assignee'>;
  label: string;
  disabled: boolean;
  min?: string;
  max?: string;
}

export function StageParameterField({ name, label, disabled, min, max }: StageParameterFieldProperties) {
  const { control } = useFormContext<StageFormValues>();
  const id = `stage-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Field data-invalid={Boolean(error)} data-disabled={disabled}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {name.endsWith('Date') ? (
            <DatePicker
              {...field}
              id={id}
              disabled={disabled}
              min={min}
              max={max}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
            />
          ) : (
            <MoneyInput
              {...field}
              onValueChange={field.onChange}
              id={id}
              disabled={disabled}
              placeholder="Не задан"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
            />
          )}
          {error && <FieldError id={`${id}-error`}>{error.message}</FieldError>}
        </Field>
      )}
    />
  );
}
