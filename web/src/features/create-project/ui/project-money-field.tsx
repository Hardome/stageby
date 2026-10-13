import { Controller, type FieldPathByValue, useFormContext } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@shared/ui/field';
import { MoneyInput } from '@shared/ui/money-input';

import type { ProjectFormValues } from '../model/types';

interface ProjectMoneyFieldProperties {
  name: FieldPathByValue<ProjectFormValues, string>;
  label: string;
  disabled: boolean;
}

export function ProjectMoneyField({ name, label, disabled }: ProjectMoneyFieldProperties) {
  const { control } = useFormContext<ProjectFormValues>();
  const id = `project-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, ...field }, fieldState: { error } }) => (
        <Field data-invalid={Boolean(error)} data-disabled={disabled}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <MoneyInput
            {...field}
            onValueChange={onChange}
            disabled={disabled}
            placeholder="Не задан"
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && <FieldError id={`${id}-error`}>{error.message}</FieldError>}
        </Field>
      )}
    />
  );
}
