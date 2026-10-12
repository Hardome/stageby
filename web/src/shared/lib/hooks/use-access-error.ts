import { useCallback } from 'react';

import { useAuth } from '@shared/context';

export function errorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error && 'status' in error && typeof error.status === 'number') return error.status;
}

export function useAccessError() {
  const { clearSession, refetch } = useAuth();
  return useCallback(
    (error: unknown) => {
      const status = errorStatus(error);
      if (status === 401) void clearSession();
      else if (status === 403) void refetch();
    },
    [clearSession, refetch],
  );
}
