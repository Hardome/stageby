import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';

import { Checkbox } from '@shared/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@shared/ui/field';

import { useUpdateUser } from '@api/mutations/useUpdateUser';
import type { User } from '@api/types';

import { editFormSchema } from '../../lib/schemas';
import { notifyUserError, useUserAccessError, useUserActions } from '../../lib/use-user-actions';
import { getUserChanges, shouldRevokeOwnSession } from '../../lib/user-form';
import type { EditFormOutput, EditFormValues, UsersSearch } from '../../model/types';
import { FormActions } from './form-actions';
import { ProfileFields } from './profile-fields';
import { TextField } from './text-field';

interface EditUserFormProperties {
  user: User;
  search: UsersSearch;
}

export function EditUserForm({ user, search }: EditUserFormProperties) {
  const form = useForm<EditFormValues, unknown, EditFormOutput>({
    resolver: zodResolver(editFormSchema),
    mode: 'onChange',
    defaultValues: { fullName: user.fullName, phone: user.phone ?? '', role: user.role, isActive: user.isActive },
  });

  const { finish, currentUser } = useUserActions(search);

  const mutation = useUpdateUser({
    mutation: {
      onSuccess: (updated, { body }) => finish('updated', updated, shouldRevokeOwnSession(currentUser?.id, user, body)),
      onError: notifyUserError,
    },
  });
  useUserAccessError(mutation.error);

  function submit(values: EditFormOutput) {
    const body = getUserChanges(user, values);
    if (Object.keys(body).length > 0) mutation.mutate({ path: { userId: user.id }, body });
    else form.reset({ ...values, phone: values.phone ?? '' });
  }

  return (
    <FormProvider {...form}>
      <form className="flex flex-col gap-6" noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
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
