import { useGetUser } from '@api/queries/useGetUser';
import { getUserPathSchema as userPathSchema } from '@api/zod/getUserSchema';

import { userErrorMessage, useUserAccessError } from '../lib/use-user-actions';
import type { UsersSearch } from '../model/types';
import { EditUserForm } from './form/edit-user-form';
import { PasswordForm } from './form/password-form';
import { UserError } from './user-error';
import { UserLoading } from './user-loading';

interface UserEditorProperties {
  userId: string;
  search: UsersSearch;
  mode: 'edit' | 'password';
}

export function UserEditor({ userId, search, mode }: UserEditorProperties) {
  const id = Number(userId);

  const isValid = /^\d+$/.test(userId) && userPathSchema.safeParse({ userId: id }).success;

  const query = useGetUser({ path: { userId: id } }, { query: { enabled: isValid, retry: false } });

  useUserAccessError(query.error);

  if (!isValid) return <UserError message="Пользователь не найден." />;

  if (query.isPending) return <UserLoading />;

  if (query.isError)
    return (
      <UserError
        message={userErrorMessage(query.error)}
        retry={query.error.status === 404 ? undefined : () => void query.refetch()}
      />
    );

  return mode === 'edit' ? (
    <EditUserForm key={id} user={query.data} search={search} />
  ) : (
    <PasswordForm key={id} user={query.data} search={search} />
  );
}
