// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListUsersOptions, ListUsersStatus200, ListUsersStatus400, ListUsersStatus401, ListUsersStatus403 } from '../../types/ListUsers'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listUsers } from '../../clients/listUsers'

export const listUsersQueryKey = ({ query }: Omit<ListUsersOptions, 'headers'> = {}) => [{ url: '/users' }, ...(query ? [query] : [])] as const

type ListUsersQueryKey = ReturnType<typeof listUsersQueryKey>

export function listUsersQueryOptions({ query }: ListUsersOptions = {}, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listUsersQueryKey({ query })
  return queryOptions<ListUsersStatus200, ResponseErrorConfig<ListUsersStatus400 | ListUsersStatus401 | ListUsersStatus403>, ListUsersStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listUsers({ ...config, query, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Только руководитель. Сортировка fullName ASC, id ASC. По умолчанию активные и неактивные. Фильтры объединяются через AND.
 * @summary Список пользователей
 * {@link /users}
 */
export function useListUsers<TData = ListUsersStatus200, TQueryData = ListUsersStatus200, TQueryKey extends QueryKey = ListUsersQueryKey>({ query }: { query?: ListUsersOptions['query'] | (() => ListUsersOptions['query']) } = {}, options: {
  query?: Partial<QueryObserverOptions<ListUsersStatus200, ResponseErrorConfig<ListUsersStatus400 | ListUsersStatus401 | ListUsersStatus403>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { query: typeof query === 'function' ? query() : query }
  const queryKey = resolvedOptions?.queryKey ?? listUsersQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listUsersQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListUsersStatus400 | ListUsersStatus401 | ListUsersStatus403>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
