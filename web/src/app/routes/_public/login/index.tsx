import { createFileRoute, Navigate } from '@tanstack/react-router';

import { LoginPage } from '@pages/login/login.page';
import { useAuth } from '@shared/context';
import { loginSearch, roleHome } from '@shared/lib';

import { AuthStatus } from '../../../providers/auth-status';

export const Route = createFileRoute('/_public/login/')({
  component: LoginRoute,
  validateSearch: loginSearch,
  head: () => ({ meta: [{ title: 'Вход' }] }),
});

function LoginRoute() {
  const { user, isPending, error } = useAuth();
  const { returnTo } = Route.useSearch();

  if (isPending || error) return <AuthStatus />;

  return user ? <Navigate to={roleHome(user.role)} href={returnTo} replace /> : <LoginPage />;
}
