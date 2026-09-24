// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListStagesOptions, ListStagesStatus200, ListStagesStatus400, ListStagesStatus401 } from '../../types/ListStages'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listStages } from '../../clients/listStages'

export const listStagesQueryKey = ({ query }: Omit<ListStagesOptions, 'headers'> = {}) => [{ url: '/stages' }, ...(query ? [query] : [])] as const

type ListStagesQueryKey = ReturnType<typeof listStagesQueryKey>

export function listStagesQueryOptions({ query }: ListStagesOptions = {}, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listStagesQueryKey({ query })
  return queryOptions<ListStagesStatus200, ResponseErrorConfig<ListStagesStatus400 | ListStagesStatus401>, ListStagesStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listStages({ ...config, query, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Руководитель и инженер видят все этапы; мастер — только где assigneeId равен его ID; приёмщик — только где inspectorId равен его ID. Фильтры AND применяются после ограничения доступа, total не раскрывает чужие записи. По умолчанию без архивных проектов. Сортировка projectId ASC, position ASC, id ASC.
 * @summary Список доступных этапов
 * {@link /stages}
 */
export function useListStages<TData = ListStagesStatus200, TQueryData = ListStagesStatus200, TQueryKey extends QueryKey = ListStagesQueryKey>({ query }: { query?: ListStagesOptions['query'] | (() => ListStagesOptions['query']) } = {}, options: {
  query?: Partial<QueryObserverOptions<ListStagesStatus200, ResponseErrorConfig<ListStagesStatus400 | ListStagesStatus401>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { query: typeof query === 'function' ? query() : query }
  const queryKey = resolvedOptions?.queryKey ?? listStagesQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listStagesQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListStagesStatus400 | ListStagesStatus401>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
