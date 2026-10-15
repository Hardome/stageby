import { useId } from 'react';

import { useFormContext } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@shared/ui/field';
import { Textarea } from '@shared/ui/textarea';

import type { WorkFormValues } from '../lib/work-form';
import { WorkRowFields } from './work-row-fields';

export function WorkPaymentFields({ disabled }: { disabled: boolean }) {
  const id = useId();
  const {
    register,
    formState: { errors },
  } = useFormContext<WorkFormValues>();

  return (
    <>
      <WorkRowFields disabled={disabled} payment />
      <Field data-invalid={Boolean(errors.comment)}>
        <FieldLabel htmlFor={id}>Комментарий (необязательно)</FieldLabel>
        <Textarea
          {...register('comment')}
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(errors.comment)}
          aria-describedby={errors.comment ? `${id}-error` : undefined}
        />
        {errors.comment && <FieldError id={`${id}-error`}>{errors.comment.message}</FieldError>}
      </Field>
    </>
  );
}
