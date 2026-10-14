import { createRootRoute, HeadContent, Outlet } from '@tanstack/react-router';

import { NotFound } from '@shared/ui/not-found';

import { RouterDevtools } from '../devtools/tanstack-router-devtools';

export const Route = createRootRoute({
  component: RootRoute,
  notFoundComponent: NotFound,
});

function RootRoute() {
  return (
    <>
      <HeadContent />
      <Outlet />
      <RouterDevtools />
    </>
  );
}
