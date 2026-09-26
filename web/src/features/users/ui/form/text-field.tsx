import type { ComponentProps } from 'react';

import { Field, FieldError, FieldLabel } from '@shared/ui/field';
import { Input } from '@shared/ui/input';

interface TextFieldProperties extends ComponentProps<typeof Input> {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...properties }: TextFieldProperties) {
  return (
    <Field data-invalid={Boolean(error)} data-disabled={properties.disabled}>
      <FieldLabel htmlFor={properties.id}>{label}</FieldLabel>
      <Input
        {...properties}
        className="min-h-11"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${properties.id}-error` : undefined}
      />
      {error && <FieldError id={`${properties.id}-error`}>{error}</FieldError>}
    </Field>
  );
}
