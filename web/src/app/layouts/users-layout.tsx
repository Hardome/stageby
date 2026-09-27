import { Navigate, Outlet } from '@tanstack/react-router';

import { useAuth } from '@shared/context';

export function UsersLayout() {
  const { user } = useAuth();

  return user?.role === 'manager' ? <Outlet /> : <Navigate to="/" replace />;
}
