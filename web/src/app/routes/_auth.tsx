import { createFileRoute, Navigate, Outlet, useLocation } from '@tanstack/react-router';

import { AppHeader } from '@widgets/app-header';
import { useAuth } from '@shared/context';
import { safeReturnTo } from '@shared/lib';

import { AuthStatus } from '../providers/auth-status';

export const Route = createFileRoute('/_auth')({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, isPending, error } = useAuth();
  const href = useLocation({ select: (location) => location.href });

  if (isPending || error) return <AuthStatus />;
  if (!user) {
    const returnTo = safeReturnTo(href);

    return returnTo ? <Navigate to="/login" search={{ returnTo }} replace /> : <AuthStatus />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <div key={user.id} className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
