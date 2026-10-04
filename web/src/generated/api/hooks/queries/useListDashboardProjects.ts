// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListDashboardProjectsOptions, ListDashboardProjectsStatus200, ListDashboardProjectsStatus400, ListDashboardProjectsStatus401, ListDashboardProjectsStatus403 } from '../../types/ListDashboardProjects'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listDashboardProjects } from '../../clients/listDashboardProjects'

export const listDashboardProjectsQueryKey = ({ query }: Omit<ListDashboardProjectsOptions, 'headers'> = {}) => [{ url: '/dashboard/projects' }, ...(query ? [query] : [])] as const

type ListDashboardProjectsQueryKey = ReturnType<typeof listDashboardProjectsQueryKey>

export function listDashboardProjectsQueryOptions({ query }: ListDashboardProjectsOptions = {}, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listDashboardProjectsQueryKey({ query })
  return queryOptions<ListDashboardProjectsStatus200, ResponseErrorConfig<ListDashboardProjectsStatus400 | ListDashboardProjectsStatus401 | ListDashboardProjectsStatus403>, ListDashboardProjectsStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listDashboardProjects({ ...config, query, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Только руководитель. Загружается независимо от summary. Для активного объекта selectedStage — первый включённый по position этап со статусом не paid; все даты, мастер, суммы и индикаторы внутри selectedStage относятся только к нему. Завершённый объект возвращается с selectedStage=null. Сортировка активных строк по plannedStartDate выбранного этапа ASC, затем projectId ASC; завершённые строки идут после активных по projectId ASC.
 * @summary Строки объектов панели руководителя
 * {@link /dashboard/projects}
 */
export function useListDashboardProjects<TData = ListDashboardProjectsStatus200, TQueryData = ListDashboardProjectsStatus200, TQueryKey extends QueryKey = ListDashboardProjectsQueryKey>({ query }: { query?: ListDashboardProjectsOptions['query'] | (() => ListDashboardProjectsOptions['query']) } = {}, options: {
  query?: Partial<QueryObserverOptions<ListDashboardProjectsStatus200, ResponseErrorConfig<ListDashboardProjectsStatus400 | ListDashboardProjectsStatus401 | ListDashboardProjectsStatus403>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { query: typeof query === 'function' ? query() : query }
  const queryKey = resolvedOptions?.queryKey ?? listDashboardProjectsQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listDashboardProjectsQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListDashboardProjectsStatus400 | ListDashboardProjectsStatus401 | ListDashboardProjectsStatus403>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
