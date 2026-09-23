// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListTodosStatus200 } from '../../types/ListTodos'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listTodos } from '../../clients/listTodos'

export const listTodosQueryKey = () => [{ url: '/todos' }] as const

type ListTodosQueryKey = ReturnType<typeof listTodosQueryKey>

export function listTodosQueryOptions(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listTodosQueryKey()
  return queryOptions<ListTodosStatus200, ResponseErrorConfig<Error>, ListTodosStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listTodos({ ...config, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @summary List todos
 * {@link /todos}
 */
export function useListTodos<TData = ListTodosStatus200, TQueryData = ListTodosStatus200, TQueryKey extends QueryKey = ListTodosQueryKey>(options: {
  query?: Partial<QueryObserverOptions<ListTodosStatus200, ResponseErrorConfig<Error>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const queryKey = resolvedOptions?.queryKey ?? listTodosQueryKey()

  const queryResult = useQuery({
   ...listTodosQueryOptions(config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<Error>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
