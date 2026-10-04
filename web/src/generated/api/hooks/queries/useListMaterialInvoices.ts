// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListMaterialInvoicesOptions, ListMaterialInvoicesStatus200, ListMaterialInvoicesStatus401, ListMaterialInvoicesStatus403, ListMaterialInvoicesStatus404 } from '../../types/ListMaterialInvoices'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listMaterialInvoices } from '../../clients/listMaterialInvoices'

export const listMaterialInvoicesQueryKey = ({ path }: Omit<ListMaterialInvoicesOptions, 'headers'>) => [{ url: '/material-orders/:orderId/invoices', params: path }] as const

type ListMaterialInvoicesQueryKey = ReturnType<typeof listMaterialInvoicesQueryKey>

export function listMaterialInvoicesQueryOptions({ path }: ListMaterialInvoicesOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listMaterialInvoicesQueryKey({ path })
  return queryOptions<ListMaterialInvoicesStatus200, ResponseErrorConfig<ListMaterialInvoicesStatus401 | ListMaterialInvoicesStatus403 | ListMaterialInvoicesStatus404>, ListMaterialInvoicesStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listMaterialInvoices({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @summary Счета заказа
 * @deprecated
 * {@link /material-orders/:orderId/invoices}
 */
export function useListMaterialInvoices<TData = ListMaterialInvoicesStatus200, TQueryData = ListMaterialInvoicesStatus200, TQueryKey extends QueryKey = ListMaterialInvoicesQueryKey>({ path }: { path: ListMaterialInvoicesOptions['path'] | (() => ListMaterialInvoicesOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<ListMaterialInvoicesStatus200, ResponseErrorConfig<ListMaterialInvoicesStatus401 | ListMaterialInvoicesStatus403 | ListMaterialInvoicesStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? listMaterialInvoicesQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listMaterialInvoicesQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListMaterialInvoicesStatus401 | ListMaterialInvoicesStatus403 | ListMaterialInvoicesStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
