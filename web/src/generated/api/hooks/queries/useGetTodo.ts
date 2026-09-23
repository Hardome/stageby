// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetTodoOptions, GetTodoStatus200, GetTodoStatus404 } from '../../types/GetTodo'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getTodo } from '../../clients/getTodo'

export const getTodoQueryKey = ({ path }: Omit<GetTodoOptions, 'headers'>) => [{ url: '/todos/:id', params: path }] as const

type GetTodoQueryKey = ReturnType<typeof getTodoQueryKey>

export function getTodoQueryOptions({ path }: GetTodoOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getTodoQueryKey({ path })
  return queryOptions<GetTodoStatus200, ResponseErrorConfig<GetTodoStatus404>, GetTodoStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getTodo({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @summary Get a todo
 * {@link /todos/:id}
 */
export function useGetTodo<TData = GetTodoStatus200, TQueryData = GetTodoStatus200, TQueryKey extends QueryKey = GetTodoQueryKey>({ path }: { path: GetTodoOptions['path'] | (() => GetTodoOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetTodoStatus200, ResponseErrorConfig<GetTodoStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getTodoQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getTodoQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetTodoStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
