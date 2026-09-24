// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetStageChecklistOptions, GetStageChecklistStatus200, GetStageChecklistStatus400, GetStageChecklistStatus401, GetStageChecklistStatus403, GetStageChecklistStatus404 } from '../../types/GetStageChecklist'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getStageChecklist } from '../../clients/getStageChecklist'

export const getStageChecklistQueryKey = ({ path }: Omit<GetStageChecklistOptions, 'headers'>) => [{ url: '/stages/:stageId/checklist', params: path }] as const

type GetStageChecklistQueryKey = ReturnType<typeof getStageChecklistQueryKey>

export function getStageChecklistQueryOptions({ path }: GetStageChecklistOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getStageChecklistQueryKey({ path })
  return queryOptions<GetStageChecklistStatus200, ResponseErrorConfig<GetStageChecklistStatus400 | GetStageChecklistStatus401 | GetStageChecklistStatus403 | GetStageChecklistStatus404>, GetStageChecklistStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getStageChecklist({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Один чек-лист на этап, создаётся вместе с проектом. Доступ как к этапу. Первоначально items=[], progressPercent=0, version=1.
 * @summary Чек-лист этапа
 * {@link /stages/:stageId/checklist}
 */
export function useGetStageChecklist<TData = GetStageChecklistStatus200, TQueryData = GetStageChecklistStatus200, TQueryKey extends QueryKey = GetStageChecklistQueryKey>({ path }: { path: GetStageChecklistOptions['path'] | (() => GetStageChecklistOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetStageChecklistStatus200, ResponseErrorConfig<GetStageChecklistStatus400 | GetStageChecklistStatus401 | GetStageChecklistStatus403 | GetStageChecklistStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getStageChecklistQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getStageChecklistQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetStageChecklistStatus400 | GetStageChecklistStatus401 | GetStageChecklistStatus403 | GetStageChecklistStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
