import { createFileRoute } from '@tanstack/react-router';

import { CreateUserPage } from '@pages/users/create-user.page';

export const Route = createFileRoute('/_auth/users/new')({
  component: CreateUserPage,
  head: () => ({ meta: [{ title: 'Новый пользователь' }] }),
});
