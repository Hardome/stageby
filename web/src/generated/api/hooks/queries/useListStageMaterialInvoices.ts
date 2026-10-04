// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListStageMaterialInvoicesOptions, ListStageMaterialInvoicesStatus200, ListStageMaterialInvoicesStatus401, ListStageMaterialInvoicesStatus403, ListStageMaterialInvoicesStatus404 } from '../../types/ListStageMaterialInvoices'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listStageMaterialInvoices } from '../../clients/listStageMaterialInvoices'

export const listStageMaterialInvoicesQueryKey = ({ path }: Omit<ListStageMaterialInvoicesOptions, 'headers'>) => [{ url: '/stages/:stageId/material-invoices', params: path }] as const

type ListStageMaterialInvoicesQueryKey = ReturnType<typeof listStageMaterialInvoicesQueryKey>

export function listStageMaterialInvoicesQueryOptions({ path }: ListStageMaterialInvoicesOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listStageMaterialInvoicesQueryKey({ path })
  return queryOptions<ListStageMaterialInvoicesStatus200, ResponseErrorConfig<ListStageMaterialInvoicesStatus401 | ListStageMaterialInvoicesStatus403 | ListStageMaterialInvoicesStatus404>, ListStageMaterialInvoicesStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listStageMaterialInvoices({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Руководитель видит счета любого этапа, мастер — только назначенного ему. Сортировка createdAt ASC, id ASC. Заказ материалов пользователем не создаётся.
 * @summary Счета материалов этапа
 * {@link /stages/:stageId/material-invoices}
 */
export function useListStageMaterialInvoices<TData = ListStageMaterialInvoicesStatus200, TQueryData = ListStageMaterialInvoicesStatus200, TQueryKey extends QueryKey = ListStageMaterialInvoicesQueryKey>({ path }: { path: ListStageMaterialInvoicesOptions['path'] | (() => ListStageMaterialInvoicesOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<ListStageMaterialInvoicesStatus200, ResponseErrorConfig<ListStageMaterialInvoicesStatus401 | ListStageMaterialInvoicesStatus403 | ListStageMaterialInvoicesStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? listStageMaterialInvoicesQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listStageMaterialInvoicesQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListStageMaterialInvoicesStatus401 | ListStageMaterialInvoicesStatus403 | ListStageMaterialInvoicesStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
