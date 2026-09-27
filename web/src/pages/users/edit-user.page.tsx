import { useParams, useSearch } from '@tanstack/react-router';

import { UserEditor, UserFormLayout } from '@features/users';

export function EditUserPage() {
  const search = useSearch({ from: '/_auth/users' });
  const { userId } = useParams({ from: '/_auth/users/$userId/edit' });

  return (
    <UserFormLayout
      title="Редактировать пользователя"
      description="Контакты, роль и активность учётной записи."
      search={search}
    >
      <UserEditor userId={userId} search={search} mode="edit" />
    </UserFormLayout>
  );
}
