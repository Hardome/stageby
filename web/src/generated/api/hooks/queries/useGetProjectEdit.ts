// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetProjectEditOptions, GetProjectEditStatus200, GetProjectEditStatus400, GetProjectEditStatus401, GetProjectEditStatus403, GetProjectEditStatus404 } from '../../types/GetProjectEdit'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getProjectEdit } from '../../clients/getProjectEdit'

export const getProjectEditQueryKey = ({ path }: Omit<GetProjectEditOptions, 'headers'>) => [{ url: '/projects/:projectId/edit', params: path }] as const

type GetProjectEditQueryKey = ReturnType<typeof getProjectEditQueryKey>

export function getProjectEditQueryOptions({ path }: GetProjectEditOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getProjectEditQueryKey({ path })
  return queryOptions<GetProjectEditStatus200, ResponseErrorConfig<GetProjectEditStatus400 | GetProjectEditStatus401 | GetProjectEditStatus403 | GetProjectEditStatus404>, GetProjectEditStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getProjectEdit({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Только руководитель. Согласованный снимок реквизитов, документов, всех этапов (включая исключённые), чек-листов и версий.
 * @summary Загрузить форму редактирования объекта
 * {@link /projects/:projectId/edit}
 */
export function useGetProjectEdit<TData = GetProjectEditStatus200, TQueryData = GetProjectEditStatus200, TQueryKey extends QueryKey = GetProjectEditQueryKey>({ path }: { path: GetProjectEditOptions['path'] | (() => GetProjectEditOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetProjectEditStatus200, ResponseErrorConfig<GetProjectEditStatus400 | GetProjectEditStatus401 | GetProjectEditStatus403 | GetProjectEditStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getProjectEditQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getProjectEditQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetProjectEditStatus400 | GetProjectEditStatus401 | GetProjectEditStatus403 | GetProjectEditStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
