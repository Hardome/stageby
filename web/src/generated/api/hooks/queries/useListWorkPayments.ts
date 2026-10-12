// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListWorkPaymentsOptions, ListWorkPaymentsStatus200, ListWorkPaymentsStatus401, ListWorkPaymentsStatus403, ListWorkPaymentsStatus404 } from '../../types/ListWorkPayments'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listWorkPayments } from '../../clients/listWorkPayments'

export const listWorkPaymentsQueryKey = ({ path }: Omit<ListWorkPaymentsOptions, 'headers'>) => [{ url: '/stages/:stageId/work-payments', params: path }] as const

type ListWorkPaymentsQueryKey = ReturnType<typeof listWorkPaymentsQueryKey>

export function listWorkPaymentsQueryOptions({ path }: ListWorkPaymentsOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listWorkPaymentsQueryKey({ path })
  return queryOptions<ListWorkPaymentsStatus200, ResponseErrorConfig<ListWorkPaymentsStatus401 | ListWorkPaymentsStatus403 | ListWorkPaymentsStatus404>, ListWorkPaymentsStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listWorkPayments({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Руководитель видит все выплаты, назначенный мастер — собственные. Платежи отсортированы по paidAt DESC, id DESC.
 * @summary Платежи за работы этапа
 * {@link /stages/:stageId/work-payments}
 */
export function useListWorkPayments<TData = ListWorkPaymentsStatus200, TQueryData = ListWorkPaymentsStatus200, TQueryKey extends QueryKey = ListWorkPaymentsQueryKey>({ path }: { path: ListWorkPaymentsOptions['path'] | (() => ListWorkPaymentsOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<ListWorkPaymentsStatus200, ResponseErrorConfig<ListWorkPaymentsStatus401 | ListWorkPaymentsStatus403 | ListWorkPaymentsStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? listWorkPaymentsQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listWorkPaymentsQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListWorkPaymentsStatus401 | ListWorkPaymentsStatus403 | ListWorkPaymentsStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
