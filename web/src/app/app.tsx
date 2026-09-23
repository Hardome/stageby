import { createRouter, RouterProvider } from '@tanstack/react-router';

import { routeTree } from '@route-tree';

import { ReactQueryProvider } from './providers/react-query-provider';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <ReactQueryProvider>
      <RouterProvider router={router} />
    </ReactQueryProvider>
  );
}
