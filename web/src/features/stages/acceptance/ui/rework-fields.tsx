import { Controller, type UseFormReturn } from 'react-hook-form';

import { todayInYekaterinburg } from '@entities/project';
import { DatePicker } from '@shared/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';

import type { ReworkFormValues } from '../model/types';

interface ReworkFieldsProperties {
  form: UseFormReturn<ReworkFormValues>;
}

export function ReworkFields({ form }: ReworkFieldsProperties) {
  const errors = form.formState.errors;

  return (
    <FieldGroup>
      <Field data-invalid={Boolean(errors.correctionDueDate)}>
        <FieldLabel htmlFor="rework-date">Срок исправления</FieldLabel>
        <Controller
          control={form.control}
          name="correctionDueDate"
          render={({ field }) => (
            <DatePicker
              {...field}
              id="rework-date"
              min={todayInYekaterinburg()}
              aria-invalid={Boolean(errors.correctionDueDate)}
              aria-describedby={errors.correctionDueDate ? 'rework-date-error' : undefined}
            />
          )}
        />
        {errors.correctionDueDate && <FieldError id="rework-date-error">{errors.correctionDueDate.message}</FieldError>}
      </Field>
    </FieldGroup>
  );
}
