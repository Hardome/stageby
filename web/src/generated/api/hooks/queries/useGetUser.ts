// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetUserOptions, GetUserStatus200, GetUserStatus400, GetUserStatus401, GetUserStatus403, GetUserStatus404 } from '../../types/GetUser'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getUser } from '../../clients/getUser'

export const getUserQueryKey = ({ path }: Omit<GetUserOptions, 'headers'>) => [{ url: '/users/:userId', params: path }] as const

type GetUserQueryKey = ReturnType<typeof getUserQueryKey>

export function getUserQueryOptions({ path }: GetUserOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getUserQueryKey({ path })
  return queryOptions<GetUserStatus200, ResponseErrorConfig<GetUserStatus400 | GetUserStatus401 | GetUserStatus403 | GetUserStatus404>, GetUserStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getUser({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Только руководитель. Остальные получают свой профиль через /auth/me.
 * @summary Карточка пользователя
 * {@link /users/:userId}
 */
export function useGetUser<TData = GetUserStatus200, TQueryData = GetUserStatus200, TQueryKey extends QueryKey = GetUserQueryKey>({ path }: { path: GetUserOptions['path'] | (() => GetUserOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetUserStatus200, ResponseErrorConfig<GetUserStatus400 | GetUserStatus401 | GetUserStatus403 | GetUserStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getUserQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getUserQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetUserStatus400 | GetUserStatus401 | GetUserStatus403 | GetUserStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
