import type { ComponentProps } from 'react';

import { type FieldPath, useFormContext } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@shared/ui/field';
import { Input } from '@shared/ui/input';

import type { ProjectFormValues } from '../model/types';

interface ProjectFieldProperties extends Omit<ComponentProps<typeof Input>, 'name'> {
  name: FieldPath<ProjectFormValues>;
  label: string;
}

export function ProjectField({ name, label, ...properties }: ProjectFieldProperties) {
  const { register, getFieldState, formState } = useFormContext<ProjectFormValues>();
  const { error } = getFieldState(name, formState);
  const id = `project-${name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...register(name)}
        {...properties}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error.message}</FieldError>}
    </Field>
  );
}
