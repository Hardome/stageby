import { Controller, type UseFormReturn } from 'react-hook-form';

import { todayInYekaterinburg } from '@entities/project';
import { DatePicker } from '@shared/ui/date-picker';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Textarea } from '@shared/ui/textarea';

import type { ReworkFormValues } from '../model/types';

interface ReworkFieldsProperties {
  form: UseFormReturn<ReworkFormValues>;
}

export function ReworkFields({ form }: ReworkFieldsProperties) {
  const errors = form.formState.errors;

  return (
    <FieldGroup>
      <Field data-invalid={Boolean(errors.comment)}>
        <FieldLabel htmlFor="rework-comment">Замечания</FieldLabel>
        <Textarea
          id="rework-comment"
          {...form.register('comment')}
          aria-invalid={Boolean(errors.comment)}
          aria-describedby={errors.comment ? 'rework-comment-error' : undefined}
        />
        {errors.comment && <FieldError id="rework-comment-error">{errors.comment.message}</FieldError>}
      </Field>
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
