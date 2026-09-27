import { createFileRoute } from '@tanstack/react-router';

import { UsersPage } from '@pages/users/users.page';

export const Route = createFileRoute('/_auth/users/')({
  component: UsersPage,
  head: () => ({ meta: [{ title: 'Пользователи' }] }),
});
