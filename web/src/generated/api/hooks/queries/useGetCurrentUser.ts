// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetCurrentUserStatus200, GetCurrentUserStatus401 } from '../../types/GetCurrentUser'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../../clients/getCurrentUser'

export const getCurrentUserQueryKey = () => [{ url: '/auth/me' }] as const

type GetCurrentUserQueryKey = ReturnType<typeof getCurrentUserQueryKey>

export function getCurrentUserQueryOptions(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getCurrentUserQueryKey()
  return queryOptions<GetCurrentUserStatus200, ResponseErrorConfig<GetCurrentUserStatus401>, GetCurrentUserStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getCurrentUser({ ...config, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Профиль текущего активного пользователя, без пароля или его хеша.
 * @summary Получить свой профиль
 * {@link /auth/me}
 */
export function useGetCurrentUser<TData = GetCurrentUserStatus200, TQueryData = GetCurrentUserStatus200, TQueryKey extends QueryKey = GetCurrentUserQueryKey>(options: {
  query?: Partial<QueryObserverOptions<GetCurrentUserStatus200, ResponseErrorConfig<GetCurrentUserStatus401>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const queryKey = resolvedOptions?.queryKey ?? getCurrentUserQueryKey()

  const queryResult = useQuery({
   ...getCurrentUserQueryOptions(config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetCurrentUserStatus401>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
