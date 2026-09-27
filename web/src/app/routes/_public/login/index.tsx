import { createFileRoute, Navigate } from '@tanstack/react-router';

import { LoginPage } from '@pages/login/login.page';
import { useAuth } from '@shared/context';

import { AuthStatus } from '../../../providers/auth-status';

export const Route = createFileRoute('/_public/login/')({
  component: LoginRoute,
  head: () => ({ meta: [{ title: 'Вход' }] }),
});

function LoginRoute() {
  const { user, isPending, error } = useAuth();

  if (isPending || error) return <AuthStatus />;

  return user ? <Navigate to="/" replace /> : <LoginPage />;
}
