import type { ComponentProps } from 'react';

import { Controller, useFormContext } from 'react-hook-form';

import type { CreateFormValues } from '../../model/types';
import { TextField } from './text-field';

interface ControlledTextFieldProperties
  extends Omit<ComponentProps<typeof TextField>, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'> {
  name: 'fullName' | 'phone' | 'login' | 'password' | 'confirmPassword';
}

export function ControlledTextField({ name, ...properties }: ControlledTextFieldProperties) {
  const { control } = useFormContext<CreateFormValues>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <TextField {...properties} {...field} value={field.value ?? ''} />}
    />
  );
}
