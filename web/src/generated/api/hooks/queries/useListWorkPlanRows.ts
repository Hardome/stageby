// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListWorkPlanRowsOptions, ListWorkPlanRowsStatus200, ListWorkPlanRowsStatus400, ListWorkPlanRowsStatus401, ListWorkPlanRowsStatus403, ListWorkPlanRowsStatus404, ListWorkPlanRowsStatus409 } from '../../types/ListWorkPlanRows'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listWorkPlanRows } from '../../clients/listWorkPlanRows'

export const listWorkPlanRowsQueryKey = ({ path }: Omit<ListWorkPlanRowsOptions, 'headers'>) => [{ url: '/stages/:stageId/work-plan-rows', params: path }] as const

type ListWorkPlanRowsQueryKey = ReturnType<typeof listWorkPlanRowsQueryKey>

export function listWorkPlanRowsQueryOptions({ path }: ListWorkPlanRowsOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listWorkPlanRowsQueryKey({ path })
  return queryOptions<ListWorkPlanRowsStatus200, ResponseErrorConfig<ListWorkPlanRowsStatus400 | ListWorkPlanRowsStatus401 | ListWorkPlanRowsStatus403 | ListWorkPlanRowsStatus404 | ListWorkPlanRowsStatus409>, ListWorkPlanRowsStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listWorkPlanRows({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Изменения доступны руководителю. Назначенный мастер читает только собственные строки. Архивный объект не изменяется.
 * @summary Строки планирования выплат
 * {@link /stages/:stageId/work-plan-rows}
 */
export function useListWorkPlanRows<TData = ListWorkPlanRowsStatus200, TQueryData = ListWorkPlanRowsStatus200, TQueryKey extends QueryKey = ListWorkPlanRowsQueryKey>({ path }: { path: ListWorkPlanRowsOptions['path'] | (() => ListWorkPlanRowsOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<ListWorkPlanRowsStatus200, ResponseErrorConfig<ListWorkPlanRowsStatus400 | ListWorkPlanRowsStatus401 | ListWorkPlanRowsStatus403 | ListWorkPlanRowsStatus404 | ListWorkPlanRowsStatus409>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? listWorkPlanRowsQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listWorkPlanRowsQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListWorkPlanRowsStatus400 | ListWorkPlanRowsStatus401 | ListWorkPlanRowsStatus403 | ListWorkPlanRowsStatus404 | ListWorkPlanRowsStatus409>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
