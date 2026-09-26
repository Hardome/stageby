import { createFileRoute, Navigate } from '@tanstack/react-router';

import { UsersPage } from '@pages/users/users.page';
import { useAuth } from '@shared/context';

export const Route = createFileRoute('/_auth/users/')({
  component: UsersRoute,
});

function UsersRoute() {
  const { user } = useAuth();

  return user?.role === 'manager' ? <UsersPage /> : <Navigate to="/" replace />;
}
