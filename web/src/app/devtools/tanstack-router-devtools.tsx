import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export function RouterDevtools() {
  return import.meta.env.DEV && <TanStackRouterDevtools />;
}
