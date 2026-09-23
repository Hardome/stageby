import { createRootRoute, Outlet } from '@tanstack/react-router';

import { RouterDevtools } from '../devtools/tanstack-router-devtools';

export const Route = createRootRoute({
  component: RootRoute,
});

function RootRoute() {
  return (
    <>
      <Outlet />
      <RouterDevtools />
    </>
  );
}
