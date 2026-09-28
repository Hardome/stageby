import { createRouter, RouterProvider } from '@tanstack/react-router';

import { routeTree } from '@route-tree';
import { AuthProvider, ThemeProvider } from '@shared/context';
import { Toaster } from '@shared/ui/toast';

import { ReactQueryProvider } from './providers/react-query-provider';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <ThemeProvider>
      <ReactQueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
