import { useFormContext } from 'react-hook-form';

import type { CreateFormValues } from '../../model/types';
import { ControlledTextField } from './controlled-text-field';

export function PasswordFields({ disabled }: { disabled: boolean }) {
  const {
    formState: { errors },
  } = useFormContext<CreateFormValues>();

  return (
    <>
      <ControlledTextField
        name="password"
        id="password"
        label="Новый пароль"
        type="password"
        autoComplete="new-password"
        maxLength={128}
        disabled={disabled}
        error={errors.password ? 'Введите пароль от 8 до 128 символов.' : undefined}
      />
      <ControlledTextField
        name="confirmPassword"
        id="confirm-password"
        label="Повторите пароль"
        type="password"
        autoComplete="new-password"
        maxLength={128}
        disabled={disabled}
        error={errors.confirmPassword ? 'Пароли не совпадают.' : undefined}
      />
    </>
  );
}
