// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetDashboardSummaryOptions, GetDashboardSummaryStatus200, GetDashboardSummaryStatus400, GetDashboardSummaryStatus401, GetDashboardSummaryStatus403 } from '../../types/GetDashboardSummary'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '../../clients/getDashboardSummary'

export const getDashboardSummaryQueryKey = ({ query }: Omit<GetDashboardSummaryOptions, 'headers'> = {}) => [{ url: '/dashboard/summary' }, ...(query ? [query] : [])] as const

type GetDashboardSummaryQueryKey = ReturnType<typeof getDashboardSummaryQueryKey>

export function getDashboardSummaryQueryOptions({ query }: GetDashboardSummaryOptions = {}, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getDashboardSummaryQueryKey({ query })
  return queryOptions<GetDashboardSummaryStatus200, ResponseErrorConfig<GetDashboardSummaryStatus400 | GetDashboardSummaryStatus401 | GetDashboardSummaryStatus403>, GetDashboardSummaryStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getDashboardSummary({ ...config, query, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Только руководитель. Считает работы, материалы и общий итог независимо от таблицы объектов. В расчёт входят этапы с plannedEndDate не позже through. Факт того же периметра включает все внесённые выплаты за работы и полные суммы оплаченных счетов; суммы не дублируются при соединении наборов данных.
 * @summary Финансовая сводка панели руководителя
 * {@link /dashboard/summary}
 */
export function useGetDashboardSummary<TData = GetDashboardSummaryStatus200, TQueryData = GetDashboardSummaryStatus200, TQueryKey extends QueryKey = GetDashboardSummaryQueryKey>({ query }: { query?: GetDashboardSummaryOptions['query'] | (() => GetDashboardSummaryOptions['query']) } = {}, options: {
  query?: Partial<QueryObserverOptions<GetDashboardSummaryStatus200, ResponseErrorConfig<GetDashboardSummaryStatus400 | GetDashboardSummaryStatus401 | GetDashboardSummaryStatus403>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { query: typeof query === 'function' ? query() : query }
  const queryKey = resolvedOptions?.queryKey ?? getDashboardSummaryQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getDashboardSummaryQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetDashboardSummaryStatus400 | GetDashboardSummaryStatus401 | GetDashboardSummaryStatus403>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
