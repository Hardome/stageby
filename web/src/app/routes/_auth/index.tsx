import { createFileRoute, Navigate } from '@tanstack/react-router';

import { HomePage } from '@pages/home/home.page';
import { projectSearchSchema } from '@features/projects/list';
import { useAuth } from '@shared/context';

export const Route = createFileRoute('/_auth/')({
  component: IndexRoute,
  validateSearch: projectSearchSchema,
  head: () => ({ meta: [{ title: 'Главная руководителя' }] }),
});

function IndexRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();

  if (user?.role === 'foreman') return <Navigate to="/my-stages" replace />;

  return (
    <HomePage
      search={search}
      onPageChange={(offset, shouldReplace) => {
        void navigate({ search: { offset }, replace: shouldReplace });
      }}
    />
  );
}
