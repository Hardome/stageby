import { createFileRoute, Navigate } from '@tanstack/react-router';

import { HomePage } from '@pages/home/home.page';
import { dashboardSearchSchema } from '@features/dashboard/view';
import { useAuth } from '@shared/context';

export const Route = createFileRoute('/_auth/')({
  component: IndexRoute,
  validateSearch: dashboardSearchSchema,
  head: () => ({ meta: [{ title: 'Главная руководителя' }] }),
});

function IndexRoute() {
  const { user } = useAuth();

  return user?.role === 'foreman' ? <Navigate to="/my-stages" replace /> : <HomePage />;
}
