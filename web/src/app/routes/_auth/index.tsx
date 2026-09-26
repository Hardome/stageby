import { createFileRoute } from '@tanstack/react-router';

import { HomePage } from '@pages/home/home.page';

export const Route = createFileRoute('/_auth/')({
  component: IndexRoute,
});

function IndexRoute() {
  return <HomePage />;
}
