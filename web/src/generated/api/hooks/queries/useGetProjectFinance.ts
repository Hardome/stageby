// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetProjectFinanceOptions, GetProjectFinanceStatus200, GetProjectFinanceStatus400, GetProjectFinanceStatus401, GetProjectFinanceStatus403, GetProjectFinanceStatus404 } from '../../types/GetProjectFinance'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getProjectFinance } from '../../clients/getProjectFinance'

export const getProjectFinanceQueryKey = ({ path }: Omit<GetProjectFinanceOptions, 'headers'>) => [{ url: '/projects/:projectId/finance', params: path }] as const

type GetProjectFinanceQueryKey = ReturnType<typeof getProjectFinanceQueryKey>

export function getProjectFinanceQueryOptions({ path }: GetProjectFinanceOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getProjectFinanceQueryKey({ path })
  return queryOptions<GetProjectFinanceStatus200, ResponseErrorConfig<GetProjectFinanceStatus400 | GetProjectFinanceStatus401 | GetProjectFinanceStatus403 | GetProjectFinanceStatus404>, GetProjectFinanceStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getProjectFinance({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Только руководитель. Итоги вычисляются по восьми этапам, независимо от пагинации. Не являются прогнозом платежей по датам.
 * @summary План-факт по проекту
 * {@link /projects/:projectId/finance}
 */
export function useGetProjectFinance<TData = GetProjectFinanceStatus200, TQueryData = GetProjectFinanceStatus200, TQueryKey extends QueryKey = GetProjectFinanceQueryKey>({ path }: { path: GetProjectFinanceOptions['path'] | (() => GetProjectFinanceOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetProjectFinanceStatus200, ResponseErrorConfig<GetProjectFinanceStatus400 | GetProjectFinanceStatus401 | GetProjectFinanceStatus403 | GetProjectFinanceStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getProjectFinanceQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getProjectFinanceQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetProjectFinanceStatus400 | GetProjectFinanceStatus401 | GetProjectFinanceStatus403 | GetProjectFinanceStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
