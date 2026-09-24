// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetProjectOptions, GetProjectStatus200, GetProjectStatus400, GetProjectStatus401, GetProjectStatus403, GetProjectStatus404 } from '../../types/GetProject'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getProject } from '../../clients/getProject'

export const getProjectQueryKey = ({ path }: Omit<GetProjectOptions, 'headers'>) => [{ url: '/projects/:projectId', params: path }] as const

type GetProjectQueryKey = ReturnType<typeof getProjectQueryKey>

export function getProjectQueryOptions({ path }: GetProjectOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getProjectQueryKey({ path })
  return queryOptions<GetProjectStatus200, ResponseErrorConfig<GetProjectStatus400 | GetProjectStatus401 | GetProjectStatus403 | GetProjectStatus404>, GetProjectStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getProject({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Руководитель и инженер-сметчик. Финансы выдаются отдельным методом.
 * @summary Карточка проекта
 * {@link /projects/:projectId}
 */
export function useGetProject<TData = GetProjectStatus200, TQueryData = GetProjectStatus200, TQueryKey extends QueryKey = GetProjectQueryKey>({ path }: { path: GetProjectOptions['path'] | (() => GetProjectOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetProjectStatus200, ResponseErrorConfig<GetProjectStatus400 | GetProjectStatus401 | GetProjectStatus403 | GetProjectStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getProjectQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getProjectQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetProjectStatus400 | GetProjectStatus401 | GetProjectStatus403 | GetProjectStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
