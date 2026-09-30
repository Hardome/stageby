// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListMaterialOrdersOptions, ListMaterialOrdersStatus200, ListMaterialOrdersStatus401, ListMaterialOrdersStatus403, ListMaterialOrdersStatus404 } from '../../types/ListMaterialOrders'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listMaterialOrders } from '../../clients/listMaterialOrders'

export const listMaterialOrdersQueryKey = ({ path }: Omit<ListMaterialOrdersOptions, 'headers'>) => [{ url: '/stages/:stageId/material-orders', params: path }] as const

type ListMaterialOrdersQueryKey = ReturnType<typeof listMaterialOrdersQueryKey>

export function listMaterialOrdersQueryOptions({ path }: ListMaterialOrdersOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listMaterialOrdersQueryKey({ path })
  return queryOptions<ListMaterialOrdersStatus200, ResponseErrorConfig<ListMaterialOrdersStatus401 | ListMaterialOrdersStatus403 | ListMaterialOrdersStatus404>, ListMaterialOrdersStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listMaterialOrders({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Руководитель видит любой этап, мастер — только назначенный ему. Сортировка createdAt ASC, id ASC.
 * @summary Заказы материалов этапа
 * {@link /stages/:stageId/material-orders}
 */
export function useListMaterialOrders<TData = ListMaterialOrdersStatus200, TQueryData = ListMaterialOrdersStatus200, TQueryKey extends QueryKey = ListMaterialOrdersQueryKey>({ path }: { path: ListMaterialOrdersOptions['path'] | (() => ListMaterialOrdersOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<ListMaterialOrdersStatus200, ResponseErrorConfig<ListMaterialOrdersStatus401 | ListMaterialOrdersStatus403 | ListMaterialOrdersStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? listMaterialOrdersQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listMaterialOrdersQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListMaterialOrdersStatus401 | ListMaterialOrdersStatus403 | ListMaterialOrdersStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
