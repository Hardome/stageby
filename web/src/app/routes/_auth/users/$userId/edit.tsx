import { createFileRoute } from '@tanstack/react-router';

import { EditUserPage } from '@pages/users/edit-user.page';

export const Route = createFileRoute('/_auth/users/$userId/edit')({
  component: EditUserPage,
  head: () => ({ meta: [{ title: 'Редактирование пользователя' }] }),
});
