import { createFileRoute } from '@tanstack/react-router';

import { UserPasswordPage } from '@pages/users/user-password.page';

export const Route = createFileRoute('/_auth/users/$userId/password')({
  component: UserPasswordPage,
  head: () => ({ meta: [{ title: 'Пароль пользователя' }] }),
});
