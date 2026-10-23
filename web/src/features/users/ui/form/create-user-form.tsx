import { FormProvider } from 'react-hook-form';

import { Button } from '@shared/ui/button';
import { FieldDescription, FieldGroup } from '@shared/ui/field';

import { useCreateUserForm } from '../../lib/use-create-user-form';
import type { UsersSearch } from '../../model/types';
import { ControlledTextField } from './controlled-text-field';
import { FormActions } from './form-actions';
import { PasswordFields } from './password-fields';
import { ProfileFields } from './profile-fields';

interface CreateUserFormProperties {
  managerId: number;
  search: UsersSearch;
}

export function CreateUserForm({ managerId, search }: Readonly<CreateUserFormProperties>) {
  const { form, mutation, errors, isLoading, loginValidationMessage, clearDraft, submit } = useCreateUserForm(
    managerId,
    search,
  );

  return (
    <FormProvider {...form}>
      <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void submit(event)}>
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
