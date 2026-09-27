import { Controller, useFormContext } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@shared/ui/field';

import type { CreateFormValues } from '../../model/types';
import { ControlledTextField } from './controlled-text-field';
import { RoleSelect } from './role-select';

export function ProfileFields({ disabled }: { disabled: boolean }) {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateFormValues>();

  return (
    <>
      <ControlledTextField
        name="fullName"
        id="full-name"
        label="Полное имя"
        autoComplete="name"
        maxLength={255}
        disabled={disabled}
        error={errors.fullName ? 'Введите имя (до 255 символов).' : undefined}
      />
      <Field data-invalid={Boolean(errors.role)} data-disabled={disabled}>
        <FieldLabel htmlFor="user-role">Роль</FieldLabel>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <RoleSelect
              id="user-role"
              value={field.value ?? null}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              disabled={disabled}
              invalid={Boolean(errors.role)}
            />
          )}
        />
        {errors.role && <FieldError id="user-role-error">Выберите роль.</FieldError>}
      </Field>
      <ControlledTextField
        name="phone"
        id="phone"
        label="Телефон (необязательно)"
        type="tel"
        autoComplete="tel"
        maxLength={32}
        disabled={disabled}
        error={errors.phone ? 'Телефон — до 32 символов.' : undefined}
      />
    </>
  );
}
