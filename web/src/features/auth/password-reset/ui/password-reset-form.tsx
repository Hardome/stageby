import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Input } from '@shared/ui/input';
import { Spinner } from '@shared/ui/spinner';

import { usePasswordResetForm } from '../lib/use-password-reset-form';

export function PasswordResetForm() {
  const { form, submit, pending, success, error, clearError } = usePasswordResetForm();

  if (success) {
    return (
      <Alert variant="success" role="status">
        <AlertDescription>
          Запрос принят.{' '}
          <span className="block">
            Если аккаунт доступен, руководитель назначит новый пароль и передаст его вам вне приложения.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  const loginError = form.formState.errors.login;

  return (
    <form className="flex flex-col gap-6" noValidate aria-busy={pending} onSubmit={(event) => void submit(event)}>
      <FieldGroup>
        <Field data-invalid={Boolean(loginError)} data-disabled={pending}>
          <FieldLabel htmlFor="reset-login">Логин</FieldLabel>
          <Input
            id="reset-login"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Ваш логин"
            aria-invalid={Boolean(loginError)}
            aria-describedby={loginError ? 'reset-login-error' : undefined}
            disabled={pending}
            {...form.register('login', { onChange: clearError })}
          />
          {loginError && (
            <FieldError id="reset-login-error">
              Введите логин латиницей: 3–64 символа, строчные буквы, цифры, точка, дефис или подчёркивание.
            </FieldError>
          )}
        </Field>
      </FieldGroup>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button className="w-full" disabled={pending} size="lg" type="submit">
        {pending && <Spinner aria-label="Отправка запроса" data-icon="inline-start" />}
        {pending ? 'Отправляем…' : 'Запросить новый пароль'}
      </Button>
    </form>
  );
}
