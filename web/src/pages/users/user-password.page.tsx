import { useParams, useSearch } from '@tanstack/react-router';

import { UserEditor, UserFormLayout } from '@features/users';

export function UserPasswordPage() {
  const search = useSearch({ from: '/_auth/users' });
  const { userId } = useParams({ from: '/_auth/users/$userId/password' });

  return (
    <UserFormLayout title="Сменить пароль" description="Установите новый пароль для пользователя." search={search}>
      <UserEditor userId={userId} search={search} mode="password" />
    </UserFormLayout>
  );
}
