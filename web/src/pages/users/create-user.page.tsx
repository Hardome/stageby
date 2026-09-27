import { useSearch } from '@tanstack/react-router';

import { CreateUserForm, UserFormLayout } from '@features/users';
import { useAuth } from '@shared/context';

export function CreateUserPage() {
  const search = useSearch({ from: '/_auth/users' });
  const { user } = useAuth();

  return (
    <UserFormLayout
      title="Создать пользователя"
      description="Новый сотрудник получит доступ по логину и паролю."
      search={search}
    >
      {user && <CreateUserForm key={user.id} managerId={user.id} search={search} />}
    </UserFormLayout>
  );
}
