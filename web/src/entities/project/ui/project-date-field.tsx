import { Controller, type FieldPathByValue, useFormContext } from 'react-hook-form';

import { DatePicker } from '@shared/ui/date-picker';
import { Field, FieldError, FieldLabel } from '@shared/ui/field';

import type { ProjectFormValues } from '../model/types';

interface ProjectDateFieldProperties {
  name: FieldPathByValue<ProjectFormValues, string>;
  label: string;
  disabled: boolean;
  required?: boolean;
  min?: string;
  max?: string;
}

export function ProjectDateField({ name, label, required, ...properties }: Readonly<ProjectDateFieldProperties>) {
  const { control } = useFormContext<ProjectFormValues>();
  const id = `project-${name}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Field className="min-w-0" data-invalid={Boolean(error)} data-disabled={properties.disabled}>
          <FieldLabel id={`${id}-label`} htmlFor={id}>
            {label}
            {required && <span className="text-destructive">*</span>}
          </FieldLabel>
          <DatePicker
            {...field}
            {...properties}
            id={id}
            aria-labelledby={`${id}-label`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && <FieldError id={`${id}-error`}>{error.message}</FieldError>}
        </Field>
      )}
    />
  );
}
