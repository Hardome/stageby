// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateFileUploadOptions, CreateFileUploadStatus201, CreateFileUploadStatus400, CreateFileUploadStatus401, CreateFileUploadStatus403, CreateFileUploadStatus413 } from '../../types/CreateFileUpload'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createFileUpload } from '../../clients/createFileUpload'

export const createFileUploadMutationKey = () => [{ url: '/file-uploads' }] as const

export function createFileUploadMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createFileUploadMutationKey()
  return mutationOptions<CreateFileUploadStatus201, ResponseErrorConfig<CreateFileUploadStatus400 | CreateFileUploadStatus401 | CreateFileUploadStatus403 | CreateFileUploadStatus413>, CreateFileUploadOptions, TContext>({
    mutationKey,
    mutationFn: async({ body }) => {
      return createFileUpload({ ...config, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Создаёт запись файла и возвращает короткоживущие подписанные данные для прямой загрузки в закрытое S3-совместимое хранилище.
 * @summary Создать upload-сессию
 * {@link /file-uploads}
 */
export function useCreateFileUpload<TContext>(options: {
  mutation?: UseMutationOptions<CreateFileUploadStatus201, ResponseErrorConfig<CreateFileUploadStatus400 | CreateFileUploadStatus401 | CreateFileUploadStatus403 | CreateFileUploadStatus413>, CreateFileUploadOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createFileUploadMutationKey()

  const baseOptions = createFileUploadMutationOptions(config) as UseMutationOptions<CreateFileUploadStatus201, ResponseErrorConfig<CreateFileUploadStatus400 | CreateFileUploadStatus401 | CreateFileUploadStatus403 | CreateFileUploadStatus413>, CreateFileUploadOptions, TContext>

  return useMutation<CreateFileUploadStatus201, ResponseErrorConfig<CreateFileUploadStatus400 | CreateFileUploadStatus401 | CreateFileUploadStatus403 | CreateFileUploadStatus413>, CreateFileUploadOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateFileUploadStatus201, ResponseErrorConfig<CreateFileUploadStatus400 | CreateFileUploadStatus401 | CreateFileUploadStatus403 | CreateFileUploadStatus413>, CreateFileUploadOptions, TContext>
}
