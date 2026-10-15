import { useCallback, useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { clearSessionDrafts, errorStatus, reconcileSessionOwner, setSessionOwner } from '@shared/lib';
import { pauseUploadSession, resumeUploadSession } from '@shared/lib/storage';

import { getCurrentUserQueryKey, useGetCurrentUser } from '@api/queries/useGetCurrentUser';
import type { User } from '@api/types';

import type { AuthContextValue } from '../model/context';

export function useAuthSession(): AuthContextValue {
  const queryClient = useQueryClient();
  const query = useGetCurrentUser({ query: { retry: false, staleTime: 30_000 } });
  const isUnauthorized = query.error?.status === 401;
  const previousUser = useRef<User | null>(null);

  const clearSession = useCallback<AuthContextValue['clearSession']>(
    async (reason = 'logout', nextUserId) => {
      if (reason === 'logout') {
        pauseUploadSession(true);
        clearSessionDrafts();
        setSessionOwner();
      } else if (reason === 'sign-in' && nextUserId !== undefined) {
        reconcileSessionOwner(nextUserId);
        resumeUploadSession(nextUserId);
      } else if (reason === 'expired') {
        pauseUploadSession();
      }

      await queryClient.cancelQueries();

      queryClient.setQueryData(getCurrentUserQueryKey(), null);
      const authQuery = queryClient.getQueryCache().find({ queryKey: getCurrentUserQueryKey() });

      queryClient.removeQueries({ predicate: (cachedQuery) => cachedQuery !== authQuery });
      queryClient.getMutationCache().clear();
      previousUser.current = null;
    },
    [queryClient],
  );

  useEffect(() => {
    if (query.data) {
      const previous = previousUser.current;
      if (previous && (previous.id !== query.data.id || previous.role !== query.data.role)) {
        const authQuery = queryClient.getQueryCache().find({ queryKey: getCurrentUserQueryKey() });
        void queryClient.cancelQueries({ predicate: (cachedQuery) => cachedQuery !== authQuery });
        queryClient.removeQueries({ predicate: (cachedQuery) => cachedQuery !== authQuery });
        queryClient.getMutationCache().clear();
      }
      reconcileSessionOwner(query.data.id);
      resumeUploadSession(query.data.id);
      previousUser.current = query.data;
    }

    if (isUnauthorized) void clearSession('expired');
  }, [query.data, isUnauthorized, clearSession, queryClient]);

  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'error') return;
        const authQuery = queryClient.getQueryCache().find({ queryKey: getCurrentUserQueryKey() });
        if (event.query === authQuery) return;
        const status = errorStatus(event.query.state.error);
        if (status === 401) void clearSession('expired');
        if (status === 403 && queryClient.getQueryData(getCurrentUserQueryKey())) {
          void queryClient.invalidateQueries({ queryKey: getCurrentUserQueryKey() });
        }
      }),
    [queryClient, clearSession],
  );

  return {
    user: isUnauthorized ? null : (query.data ?? null),
    isPending: query.isPending,
    error: isUnauthorized ? null : query.error,
    refetch: query.refetch,
    clearSession,
  };
}
