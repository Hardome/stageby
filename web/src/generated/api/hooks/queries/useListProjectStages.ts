// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListProjectStagesOptions, ListProjectStagesStatus200, ListProjectStagesStatus400, ListProjectStagesStatus401, ListProjectStagesStatus403, ListProjectStagesStatus404 } from '../../types/ListProjectStages'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listProjectStages } from '../../clients/listProjectStages'

export const listProjectStagesQueryKey = ({ path }: Omit<ListProjectStagesOptions, 'headers'>) => [{ url: '/projects/:projectId/stages', params: path }] as const

type ListProjectStagesQueryKey = ReturnType<typeof listProjectStagesQueryKey>

export function listProjectStagesQueryOptions({ path }: ListProjectStagesOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listProjectStagesQueryKey({ path })
  return queryOptions<ListProjectStagesStatus200, ResponseErrorConfig<ListProjectStagesStatus400 | ListProjectStagesStatus401 | ListProjectStagesStatus403 | ListProjectStagesStatus404>, ListProjectStagesStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listProjectStages({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Без пагинации: максимум девять записей, position ASC. Руководитель видит включённые этапы; мастер — только назначенные ему. Для существующего проекта вне области доступа возвращается 404.
 * @summary Этапы одного проекта
 * {@link /projects/:projectId/stages}
 */
export function useListProjectStages<TData = ListProjectStagesStatus200, TQueryData = ListProjectStagesStatus200, TQueryKey extends QueryKey = ListProjectStagesQueryKey>({ path }: { path: ListProjectStagesOptions['path'] | (() => ListProjectStagesOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<ListProjectStagesStatus200, ResponseErrorConfig<ListProjectStagesStatus400 | ListProjectStagesStatus401 | ListProjectStagesStatus403 | ListProjectStagesStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? listProjectStagesQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listProjectStagesQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListProjectStagesStatus400 | ListProjectStagesStatus401 | ListProjectStagesStatus403 | ListProjectStagesStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
