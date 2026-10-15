import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';

import { FieldDescription, FieldGroup } from '@shared/ui/field';

import { useSetUserPassword } from '@api/mutations/useSetUserPassword';
import type { User } from '@api/types';

import { passwordFormSchema } from '../../lib/schemas';
import { notifyUserError, useUserAccessError, useUserActions } from '../../lib/use-user-actions';
import type { PasswordFormValues, UsersSearch } from '../../model/types';
import { FormActions } from './form-actions';
import { PasswordFields } from './password-fields';

interface PasswordFormProperties {
  user: User;
  search: UsersSearch;
}

export function PasswordForm({ user, search }: PasswordFormProperties) {
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
  });
  const { finishPassword } = useUserActions(search);
  const mutation = useSetUserPassword({
    mutation: {
      onError: notifyUserError,
      onSuccess: async () => {
        form.reset();
        await finishPassword(user);
      },
    },
  });
  useUserAccessError(mutation.error);

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) =>
          void form.handleSubmit(({ password }) => {
            if (!mutation.isPending) mutation.mutate({ path: { userId: user.id }, body: { password } });
          })(event)
        }
      >
        <p className="wrap-anywhere">
          {user.fullName} · {user.login}
        </p>
        <FieldGroup>
          <PasswordFields disabled={mutation.isPending} />
        </FieldGroup>
        <FieldDescription>
          Все сессии пользователя будут завершены. После смены своего пароля вам потребуется войти снова. Передайте
          новый пароль пользователю вне приложения.
        </FieldDescription>
        <FormActions pending={mutation.isPending} search={search} label="Сменить пароль" />
      </form>
    </FormProvider>
  );
}
