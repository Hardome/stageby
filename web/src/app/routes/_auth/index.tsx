import { createFileRoute } from '@tanstack/react-router';

import { HomePage } from '@pages/home/home.page';

export const Route = createFileRoute('/_auth/')({
  component: IndexRoute,
  head: () => ({ meta: [{ title: 'Мои задачи' }] }),
});

function IndexRoute() {
  return <HomePage />;
}
