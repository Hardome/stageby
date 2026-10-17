import { useCallback } from 'react';

import { useAuth } from '@shared/context';

import { errorStatus } from '../errors/error-status';

export function useAccessError() {
  const { clearSession, refetch } = useAuth();

  return useCallback(
    (error: unknown) => {
      const status = errorStatus(error);
      if (status === 401) void clearSession('expired');
      else if (status === 403) void refetch();
    },
    [clearSession, refetch],
  );
}
