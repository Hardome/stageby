import { createFileRoute } from '@tanstack/react-router';

import { PasswordResetPage } from '@pages/password-reset/password-reset.page';

export const Route = createFileRoute('/_public/password-reset')({
  component: PasswordResetPage,
  head: () => ({ meta: [{ title: 'Восстановление доступа' }] }),
});
