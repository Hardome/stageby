import { createFileRoute } from '@tanstack/react-router';

import { HomePage } from '@pages/home/home.page';
import { projectSearchSchema } from '@features/temporary-project-list';

export const Route = createFileRoute('/_auth/')({
  component: IndexRoute,
  validateSearch: projectSearchSchema,
  head: () => ({ meta: [{ title: 'Мои задачи' }] }),
});

function IndexRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <HomePage
      search={search}
      onPageChange={(offset, shouldReplace) => {
        void navigate({ search: { offset }, replace: shouldReplace });
      }}
    />
  );
}
