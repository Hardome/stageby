import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

import { AppHeader } from '@widgets/app-header';
import { useAuth } from '@shared/context';

import { AuthStatus } from '../providers/auth-status';

export const Route = createFileRoute('/_auth')({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, isPending, error } = useAuth();

  if (isPending || error) return <AuthStatus />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <Outlet />
    </div>
  );
}
