// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListActiveStageTypesStatus200, ListActiveStageTypesStatus401, ListActiveStageTypesStatus403 } from '../../types/ListActiveStageTypes'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listActiveStageTypes } from '../../clients/listActiveStageTypes'

export const listActiveStageTypesQueryKey = () => [{ url: '/stage-types' }] as const

type ListActiveStageTypesQueryKey = ReturnType<typeof listActiveStageTypesQueryKey>

export function listActiveStageTypesQueryOptions(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listActiveStageTypesQueryKey()
  return queryOptions<ListActiveStageTypesStatus200, ResponseErrorConfig<ListActiveStageTypesStatus401 | ListActiveStageTypesStatus403>, ListActiveStageTypesStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listActiveStageTypes({ ...config, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Только руководитель. Возвращает активный справочник в порядке position ASC и ровно тот активный шаблон каждого типа, который сервер копирует при создании объекта, включая photoHint. Ответ не содержит неактивные редакции.
 * @summary Активные типы этапов и шаблоны
 * {@link /stage-types}
 */
export function useListActiveStageTypes<TData = ListActiveStageTypesStatus200, TQueryData = ListActiveStageTypesStatus200, TQueryKey extends QueryKey = ListActiveStageTypesQueryKey>(options: {
  query?: Partial<QueryObserverOptions<ListActiveStageTypesStatus200, ResponseErrorConfig<ListActiveStageTypesStatus401 | ListActiveStageTypesStatus403>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const queryKey = resolvedOptions?.queryKey ?? listActiveStageTypesQueryKey()

  const queryResult = useQuery({
   ...listActiveStageTypesQueryOptions(config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListActiveStageTypesStatus401 | ListActiveStageTypesStatus403>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
