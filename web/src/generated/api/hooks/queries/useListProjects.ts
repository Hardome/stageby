// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListProjectsOptions, ListProjectsStatus200, ListProjectsStatus400, ListProjectsStatus401, ListProjectsStatus403 } from '../../types/ListProjects'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listProjects } from '../../clients/listProjects'

export const listProjectsQueryKey = ({ query }: Omit<ListProjectsOptions, 'headers'> = {}) => [{ url: '/projects' }, ...(query ? [query] : [])] as const

type ListProjectsQueryKey = ReturnType<typeof listProjectsQueryKey>

export function listProjectsQueryOptions({ query }: ListProjectsOptions = {}, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listProjectsQueryKey({ query })
  return queryOptions<ListProjectsStatus200, ResponseErrorConfig<ListProjectsStatus400 | ListProjectsStatus401 | ListProjectsStatus403>, ListProjectsStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listProjects({ ...config, query, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Руководитель и инженер-сметчик. Мастер и приёмщик работают через /stages без доступа к полной карточке клиента. Сортировка createdAt DESC, id ASC. Фильтры AND.
 * @summary Список объектов строительства
 * {@link /projects}
 */
export function useListProjects<TData = ListProjectsStatus200, TQueryData = ListProjectsStatus200, TQueryKey extends QueryKey = ListProjectsQueryKey>({ query }: { query?: ListProjectsOptions['query'] | (() => ListProjectsOptions['query']) } = {}, options: {
  query?: Partial<QueryObserverOptions<ListProjectsStatus200, ResponseErrorConfig<ListProjectsStatus400 | ListProjectsStatus401 | ListProjectsStatus403>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { query: typeof query === 'function' ? query() : query }
  const queryKey = resolvedOptions?.queryKey ?? listProjectsQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listProjectsQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListProjectsStatus400 | ListProjectsStatus401 | ListProjectsStatus403>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
