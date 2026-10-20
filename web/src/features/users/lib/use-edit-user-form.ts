import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useUpdateUser } from '@api/mutations/useUpdateUser';
import type { User } from '@api/types';

import type { EditFormOutput, EditFormValues, UsersSearch } from '../model/types';
import { editFormSchema } from './schemas';
import { notifyUserError, useUserAccessError, useUserActions } from './use-user-actions';
import { getUserChanges, shouldRevokeOwnSession } from './user-form';

export function useEditUserForm(user: User, search: UsersSearch) {
  const form = useForm<EditFormValues, unknown, EditFormOutput>({
    resolver: zodResolver(editFormSchema),
    mode: 'onChange',
    defaultValues: { fullName: user.fullName, phone: user.phone ?? '', role: user.role, isActive: user.isActive },
  });

  const { finish, currentUser } = useUserActions(search);

  const mutation = useUpdateUser({
    mutation: {
      onSuccess: (updated, { body }) => {
        return finish('updated', updated, shouldRevokeOwnSession(currentUser?.id, user, body));
      },
      onError: notifyUserError,
    },
  });

  useUserAccessError(mutation.error);

  function submit(values: EditFormOutput) {
    const body = getUserChanges(user, values);

    if (Object.keys(body).length > 0) mutation.mutate({ path: { userId: user.id }, body });
    else form.reset({ ...values, phone: values.phone ?? '' });
  }

  return { form, mutation, submit };
}
