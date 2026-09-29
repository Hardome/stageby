// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateChecklistItemPhotoOptions, CreateChecklistItemPhotoStatus201, CreateChecklistItemPhotoStatus400, CreateChecklistItemPhotoStatus401, CreateChecklistItemPhotoStatus404, CreateChecklistItemPhotoStatus409 } from '../../types/CreateChecklistItemPhoto'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createChecklistItemPhoto } from '../../clients/createChecklistItemPhoto'

export const createChecklistItemPhotoMutationKey = () => [{ url: '/checklist/items/:itemId/photos' }] as const

export function createChecklistItemPhotoMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createChecklistItemPhotoMutationKey()
  return mutationOptions<CreateChecklistItemPhotoStatus201, ResponseErrorConfig<CreateChecklistItemPhotoStatus400 | CreateChecklistItemPhotoStatus401 | CreateChecklistItemPhotoStatus404 | CreateChecklistItemPhotoStatus409>, CreateChecklistItemPhotoOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return createChecklistItemPhoto({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Атомарно привязывает фотографию и проверяет лимит двадцать активных фото. Пункт автоматически не выполняется.
 * @summary Привязать загруженную фотографию
 * {@link /checklist/items/:itemId/photos}
 */
export function useCreateChecklistItemPhoto<TContext>(options: {
  mutation?: UseMutationOptions<CreateChecklistItemPhotoStatus201, ResponseErrorConfig<CreateChecklistItemPhotoStatus400 | CreateChecklistItemPhotoStatus401 | CreateChecklistItemPhotoStatus404 | CreateChecklistItemPhotoStatus409>, CreateChecklistItemPhotoOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createChecklistItemPhotoMutationKey()

  const baseOptions = createChecklistItemPhotoMutationOptions(config) as UseMutationOptions<CreateChecklistItemPhotoStatus201, ResponseErrorConfig<CreateChecklistItemPhotoStatus400 | CreateChecklistItemPhotoStatus401 | CreateChecklistItemPhotoStatus404 | CreateChecklistItemPhotoStatus409>, CreateChecklistItemPhotoOptions, TContext>

  return useMutation<CreateChecklistItemPhotoStatus201, ResponseErrorConfig<CreateChecklistItemPhotoStatus400 | CreateChecklistItemPhotoStatus401 | CreateChecklistItemPhotoStatus404 | CreateChecklistItemPhotoStatus409>, CreateChecklistItemPhotoOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateChecklistItemPhotoStatus201, ResponseErrorConfig<CreateChecklistItemPhotoStatus400 | CreateChecklistItemPhotoStatus401 | CreateChecklistItemPhotoStatus404 | CreateChecklistItemPhotoStatus409>, CreateChecklistItemPhotoOptions, TContext>
}
