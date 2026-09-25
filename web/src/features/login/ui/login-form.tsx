import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { saveSession } from '@shared/lib/auth';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Input } from '@shared/ui/input';
import { Spinner } from '@shared/ui/spinner';

import { useLogin } from '@api/mutations/useLogin';
import { getCurrentUserQueryKey } from '@api/queries/useGetCurrentUser';
import { type LoginRequestSchemaType, loginRequestSchema } from '@api/zod/loginRequestSchema';

function getLoginErrorMessage(status?: number): string {
  if (status === 401) {
    return 'Неверный логин или пароль.';
  }

  return status === 429
    ? 'Слишком много попыток входа. Попробуйте позже.'
    : 'Не удалось войти. Проверьте соединение и попробуйте ещё раз.';
}

export function LoginForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequestSchemaType>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { login: '', password: '' },
    mode: 'onChange',
  });

  const mutation = useLogin({
    mutation: {
      onSuccess: async (session) => {
        saveSession(session);
        queryClient.clear();
        queryClient.setQueryData(getCurrentUserQueryKey(), session.user);
        await navigate({ to: '/' });
      },
    },
  });

  const onSubmit = (values: LoginRequestSchemaType) => {
    mutation.mutate({ body: values });
  };

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.login)} data-disabled={mutation.isPending}>
          <FieldLabel htmlFor="login">Логин</FieldLabel>
          <Input
            id="login"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            placeholder="Ваш логин"
            aria-invalid={Boolean(errors.login)}
            aria-describedby={errors.login ? 'login-error' : undefined}
            disabled={mutation.isPending}
            {...register('login', { onChange: () => mutation.reset() })}
          />
          {errors.login && (
            <FieldError id="login-error">
              Введите логин латиницей: 3–64 символа, строчные буквы, цифры, точка, дефис или подчёркивание.
            </FieldError>
          )}
        </Field>
        <Field data-invalid={Boolean(errors.password)} data-disabled={mutation.isPending}>
          <FieldLabel htmlFor="password">Пароль</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            maxLength={128}
            placeholder="Введите пароль"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            disabled={mutation.isPending}
            {...register('password', { onChange: () => mutation.reset() })}
          />
          {errors.password && <FieldError id="password-error">Введите пароль (до 128 символов).</FieldError>}
        </Field>
      </FieldGroup>

      {mutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getLoginErrorMessage(mutation.error?.status)}</AlertDescription>
        </Alert>
      )}

      <Button className="w-full" disabled={mutation.isPending} size="lg" type="submit">
        {mutation.isPending ? <Spinner aria-label="Выполняется вход" data-icon="inline-start" /> : null}
        {mutation.isPending ? 'Входим…' : 'Войти'}
        {!mutation.isPending && <ArrowRightIcon data-icon="inline-end" />}
      </Button>
    </form>
  );
}
