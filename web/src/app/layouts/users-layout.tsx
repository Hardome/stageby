import { Outlet } from '@tanstack/react-router';

import { useAuth } from '@shared/context';
import { NotFound } from '@shared/ui/not-found';

export function UsersLayout() {
  const { user } = useAuth();

  return user?.role === 'manager' ? <Outlet /> : <NotFound />;
}
