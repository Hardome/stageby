// @ts-nocheck

import type { QueryKey, QueryClient, QueryObserverOptions, UseQueryResult } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ListChecklistItemPhotosOptions, ListChecklistItemPhotosStatus200, ListChecklistItemPhotosStatus401, ListChecklistItemPhotosStatus404 } from '../../types/ListChecklistItemPhotos'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { listChecklistItemPhotos } from '../../clients/listChecklistItemPhotos'

export const listChecklistItemPhotosQueryKey = ({ path }: Omit<ListChecklistItemPhotosOptions, 'headers'>) => [{ url: '/checklist/items/:itemId/photos', params: path }] as const

type ListChecklistItemPhotosQueryKey = ReturnType<typeof listChecklistItemPhotosQueryKey>

export function listChecklistItemPhotosQueryOptions({ path }: ListChecklistItemPhotosOptions, config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const queryKey = listChecklistItemPhotosQueryKey({ path })
  return queryOptions<ListChecklistItemPhotosStatus200, ResponseErrorConfig<ListChecklistItemPhotosStatus401 | ListChecklistItemPhotosStatus404>, ListChecklistItemPhotosStatus200, typeof queryKey>({
   queryKey,
   queryFn: async ({ signal }) => {
      return listChecklistItemPhotos({ ...config, path, signal: config.signal ?? signal, throwOnError: true }).unwrap()
   },
  })
}

/**
 * @summary Фотографии пункта чек-листа
 * {@link /checklist/items/:itemId/photos}
 */
export function useListChecklistItemPhotos<TData = ListChecklistItemPhotosStatus200, TQueryData = ListChecklistItemPhotosStatus200, TQueryKey extends QueryKey = ListChecklistItemPhotosQueryKey>({ path }: { path: ListChecklistItemPhotosOptions['path'] | (() => ListChecklistItemPhotosOptions['path']) }, options: {
  query?: Partial<QueryObserverOptions<ListChecklistItemPhotosStatus200, ResponseErrorConfig<ListChecklistItemPhotosStatus401 | ListChecklistItemPhotosStatus404>, TData, TQueryData, TQueryKey>> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>
} = {}) {
  const { query: queryConfig = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...resolvedOptions } = queryConfig
  const resolvedParams = { path: typeof path === 'function' ? path() : path }
  const queryKey = resolvedOptions?.queryKey ?? listChecklistItemPhotosQueryKey(resolvedParams)

  const queryResult = useQuery({
   ...listChecklistItemPhotosQueryOptions(resolvedParams, config),
   ...resolvedOptions,
   queryKey,
  } as unknown as QueryObserverOptions, queryClient) as UseQueryResult<TData, ResponseErrorConfig<ListChecklistItemPhotosStatus401 | ListChecklistItemPhotosStatus404>> & { queryKey: TQueryKey }

  queryResult.queryKey = queryKey as TQueryKey

  return queryResult
}
