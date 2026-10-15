import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';

import { Button } from '@shared/ui/button';
import { FieldDescription, FieldGroup } from '@shared/ui/field';

import { useCreateUser } from '@api/mutations/useCreateUser';

import { clearCreateDraft, loadCreateDraft, saveCreateDraft } from '../../lib/create-draft';
import { userCreationFormSchema } from '../../lib/schemas';
import { notifyUserError, userErrorMessage, useUserAccessError, useUserActions } from '../../lib/use-user-actions';
import { emptyDraft } from '../../model/data';
import type { CreateFormOutput, CreateFormValues, UsersSearch } from '../../model/types';
import { ControlledTextField } from './controlled-text-field';
import { FormActions } from './form-actions';
import { PasswordFields } from './password-fields';
import { ProfileFields } from './profile-fields';

interface CreateUserFormProperties {
  managerId: number;
  search: UsersSearch;
}

export function CreateUserForm({ managerId, search }: CreateUserFormProperties) {
  const form = useForm<CreateFormValues, unknown, CreateFormOutput>({
    resolver: zodResolver(userCreationFormSchema),
    defaultValues: () => Promise.resolve({ ...loadCreateDraft(managerId), password: '', confirmPassword: '' }),
    mode: 'onChange',
  });

  const { finish } = useUserActions(search);

  const mutation = useCreateUser({
    mutation: {
      onSuccess: async (user) => {
        clearCreateDraft(managerId);
        await finish('created', user);
      },
      onError: (error) => {
        if (error.data?.code === 'login_taken') {
          form.setError('login', { type: 'server', message: userErrorMessage(error) }, { shouldFocus: true });
          return;
        }
        notifyUserError(error);
      },
    },
  });

  useUserAccessError(mutation.error);

  const {
    subscribe,
    reset,
    handleSubmit,
    formState: { errors, isLoading },
  } = form;

  const loginValidationMessage = errors.login
    ? 'От 3 до 64 символов: строчные латинские буквы, цифры, точка, дефис, подчёркивание. ' +
      'Первый символ — буква или цифра.'
    : undefined;

  useEffect(
    () => subscribe({ formState: { values: true }, callback: ({ values }) => saveCreateDraft(managerId, values) }),
    [subscribe, managerId],
  );

  function clearDraft() {
    reset({ ...emptyDraft, role: undefined, password: '', confirmPassword: '' });
    clearCreateDraft(managerId);
    mutation.reset();
  }

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) =>
          void handleSubmit(({ confirmPassword: _confirmation, ...body }) => mutation.mutate({ body }))(event)
        }
      >
        <FieldGroup>
          <ProfileFields disabled={mutation.isPending || isLoading} />
          <ControlledTextField
            name="login"
            id="user-login"
            label="Логин"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={64}
            disabled={mutation.isPending || isLoading}
            error={errors.login?.type === 'server' ? errors.login.message : loginValidationMessage}
          />
          <FieldDescription>Логин нельзя изменить после создания пользователя.</FieldDescription>
          <PasswordFields disabled={mutation.isPending || isLoading} />
        </FieldGroup>
        <FieldDescription>
          Имя, логин, роль и телефон сохраняются в этой вкладке до создания пользователя или выхода из аккаунта. Пароль
          не сохраняется.
        </FieldDescription>
        <FormActions pending={mutation.isPending} disabled={isLoading} search={search} label="Создать пользователя" />
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 self-start"
          disabled={mutation.isPending || isLoading}
          onClick={clearDraft}
        >
          Очистить черновик
        </Button>
      </form>
    </FormProvider>
  );
}
