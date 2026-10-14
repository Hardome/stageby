// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetStageOptions, GetStageStatus200, GetStageStatus400, GetStageStatus401, GetStageStatus403, GetStageStatus404 } from '../../types/GetStage'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getStage } from '../../clients/getStage'

export const getStageQueryKey = ({ path }: Omit<GetStageOptions, 'headers'>) => [{ url: '/stages/:stageId', params: path }] as const

type GetStageQueryKey = ReturnType<typeof getStageQueryKey>

export function getStageQueryOptions({ path }: GetStageOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getStageQueryKey({ path })
  return queryOptions<GetStageStatus200, ResponseErrorConfig<GetStageStatus400 | GetStageStatus401 | GetStageStatus403 | GetStageStatus404>, GetStageStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getStage({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Доступ как у /stages. Карточка содержит клиента, адрес, координаты, границы дат и ID PDF проекта, телефон мастера и номер среди всех включённых этапов. Контекст доступен назначенному мастеру без getProject; PDF открывается через getFileContent. latestAcceptance хранит последнее решение, не журнал всех проверок.
 * @summary Карточка этапа
 * {@link /stages/:stageId}
 */
export function useGetStage<TData = GetStageStatus200, TQueryData = GetStageStatus200, TQueryKey extends QueryKey = GetStageQueryKey>({ path }: { path: GetStageOptions['path'] | (() => GetStageOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetStageStatus200, ResponseErrorConfig<GetStageStatus400 | GetStageStatus401 | GetStageStatus403 | GetStageStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getStageQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getStageQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetStageStatus400 | GetStageStatus401 | GetStageStatus403 | GetStageStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
