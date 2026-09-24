// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetStageFinanceOptions, GetStageFinanceStatus200, GetStageFinanceStatus400, GetStageFinanceStatus401, GetStageFinanceStatus403, GetStageFinanceStatus404 } from '../../types/GetStageFinance'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getStageFinance } from '../../clients/getStageFinance'

export const getStageFinanceQueryKey = ({ path }: Omit<GetStageFinanceOptions, 'headers'>) => [{ url: '/stages/:stageId/finance', params: path }] as const

type GetStageFinanceQueryKey = ReturnType<typeof getStageFinanceQueryKey>

export function getStageFinanceQueryOptions({ path }: GetStageFinanceOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getStageFinanceQueryKey({ path })
  return queryOptions<GetStageFinanceStatus200, ResponseErrorConfig<GetStageFinanceStatus400 | GetStageFinanceStatus401 | GetStageFinanceStatus403 | GetStageFinanceStatus404>, GetStageFinanceStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getStageFinance({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Только руководитель. Отсутствующая оценка возвращается как null. Версия финансов независима от публичной версии этапа.
 * @summary Четыре суммы план-факт этапа
 * {@link /stages/:stageId/finance}
 */
export function useGetStageFinance<TData = GetStageFinanceStatus200, TQueryData = GetStageFinanceStatus200, TQueryKey extends QueryKey = GetStageFinanceQueryKey>({ path }: { path: GetStageFinanceOptions['path'] | (() => GetStageFinanceOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetStageFinanceStatus200, ResponseErrorConfig<GetStageFinanceStatus400 | GetStageFinanceStatus401 | GetStageFinanceStatus403 | GetStageFinanceStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getStageFinanceQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getStageFinanceQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetStageFinanceStatus400 | GetStageFinanceStatus401 | GetStageFinanceStatus403 | GetStageFinanceStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
