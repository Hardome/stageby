import { Controller, FormProvider } from 'react-hook-form';

import { Checkbox } from '@shared/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@shared/ui/field';

import type { User } from '@api/types';

import { useEditUserForm } from '../../lib/use-edit-user-form';
import type { UsersSearch } from '../../model/types';
import { FormActions } from './form-actions';
import { ProfileFields } from './profile-fields';
import { TextField } from './text-field';

interface EditUserFormProperties {
  user: User;
  search: UsersSearch;
}

export function EditUserForm({ user, search }: EditUserFormProperties) {
  const { form, mutation, submit } = useEditUserForm(user, search);

  return (
    <FormProvider {...form}>
      <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
        <FieldGroup>
          <TextField id="user-login" label="Логин" value={user.login} readOnly />
          <ProfileFields disabled={mutation.isPending} />
          <Field orientation="horizontal" data-disabled={mutation.isPending}>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Checkbox
                  id="is-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={mutation.isPending}
                />
              )}
            />
            <FieldLabel htmlFor="is-active" className="min-h-11">
              Активный пользователь
            </FieldLabel>
          </Field>
          <FieldDescription>
            Смена роли или деактивация завершит все сессии пользователя. Если вы изменяете свой аккаунт, потребуется
            войти снова.
          </FieldDescription>
        </FieldGroup>
        <FormActions pending={mutation.isPending} disabled={!form.formState.isDirty} search={search} />
      </form>
    </FormProvider>
  );
}
