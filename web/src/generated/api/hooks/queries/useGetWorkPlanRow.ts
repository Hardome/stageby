// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetWorkPlanRowOptions, GetWorkPlanRowStatus200, GetWorkPlanRowStatus400, GetWorkPlanRowStatus401, GetWorkPlanRowStatus403, GetWorkPlanRowStatus404, GetWorkPlanRowStatus409 } from '../../types/GetWorkPlanRow'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getWorkPlanRow } from '../../clients/getWorkPlanRow'

export const getWorkPlanRowQueryKey = ({ path }: Omit<GetWorkPlanRowOptions, 'headers'>) => [{ url: '/work-plan-rows/:rowId', params: path }] as const

type GetWorkPlanRowQueryKey = ReturnType<typeof getWorkPlanRowQueryKey>

export function getWorkPlanRowQueryOptions({ path }: GetWorkPlanRowOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getWorkPlanRowQueryKey({ path })
  return queryOptions<GetWorkPlanRowStatus200, ResponseErrorConfig<GetWorkPlanRowStatus400 | GetWorkPlanRowStatus401 | GetWorkPlanRowStatus403 | GetWorkPlanRowStatus404 | GetWorkPlanRowStatus409>, GetWorkPlanRowStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getWorkPlanRow({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Изменения доступны руководителю. Назначенный мастер читает только собственные строки. Архивный объект не изменяется.
 * @summary Прочитать строку выплаты
 * {@link /work-plan-rows/:rowId}
 */
export function useGetWorkPlanRow<TData = GetWorkPlanRowStatus200, TQueryData = GetWorkPlanRowStatus200, TQueryKey extends QueryKey = GetWorkPlanRowQueryKey>({ path }: { path: GetWorkPlanRowOptions['path'] | (() => GetWorkPlanRowOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetWorkPlanRowStatus200, ResponseErrorConfig<GetWorkPlanRowStatus400 | GetWorkPlanRowStatus401 | GetWorkPlanRowStatus403 | GetWorkPlanRowStatus404 | GetWorkPlanRowStatus409>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getWorkPlanRowQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getWorkPlanRowQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetWorkPlanRowStatus400 | GetWorkPlanRowStatus401 | GetWorkPlanRowStatus403 | GetWorkPlanRowStatus404 | GetWorkPlanRowStatus409>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
