import type { PropsWithChildren } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { getCurrentUserQueryKey, useGetCurrentUser } from '@api/queries/useGetCurrentUser';

import { AuthContext } from '../model/context';

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const query = useGetCurrentUser({ query: { retry: false, staleTime: 30_000 } });
  const isUnauthorized = query.error?.status === 401;

  async function clearSession() {
    await queryClient.cancelQueries();

    queryClient.setQueryData(getCurrentUserQueryKey(), null);

    const authQuery = queryClient.getQueryCache().find({ queryKey: getCurrentUserQueryKey() });

    queryClient.removeQueries({ predicate: (cachedQuery) => cachedQuery !== authQuery });
    queryClient.getMutationCache().clear();
  }

  return (
    <AuthContext
      value={{
        user: isUnauthorized ? null : (query.data ?? null),
        isPending: query.isPending,
        error: isUnauthorized ? null : query.error,
        refetch: query.refetch,
        clearSession,
      }}
    >
      {children}
    </AuthContext>
  );
}
