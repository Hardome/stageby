// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { GetFileContentOptions, GetFileContentStatus200, GetFileContentStatus401, GetFileContentStatus404 } from '../../types/GetFileContent'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getFileContent } from '../../clients/getFileContent'

export const getFileContentQueryKey = ({ path }: Omit<GetFileContentOptions, 'headers'>) => [{ url: '/files/:fileId/content', params: path }] as const

type GetFileContentQueryKey = ReturnType<typeof getFileContentQueryKey>

export function getFileContentQueryOptions({ path }: GetFileContentOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = getFileContentQueryKey({ path })
  return queryOptions<GetFileContentStatus200, ResponseErrorConfig<GetFileContentStatus401 | GetFileContentStatus404>, GetFileContentStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return getFileContent({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @description Проверяет доступ и возвращает короткоживущий подписанный URL. Постоянный storage URL не раскрывается.
 * @summary Получить файл
 * {@link /files/:fileId/content}
 */
export function useGetFileContent<TData = GetFileContentStatus200, TQueryData = GetFileContentStatus200, TQueryKey extends QueryKey = GetFileContentQueryKey>({ path }: { path: GetFileContentOptions['path'] | (() => GetFileContentOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<GetFileContentStatus200, ResponseErrorConfig<GetFileContentStatus401 | GetFileContentStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? getFileContentQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...getFileContentQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<GetFileContentStatus401 | GetFileContentStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
