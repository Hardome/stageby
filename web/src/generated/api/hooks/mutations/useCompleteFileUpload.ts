// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CompleteFileUploadOptions, CompleteFileUploadStatus200, CompleteFileUploadStatus400, CompleteFileUploadStatus401, CompleteFileUploadStatus404, CompleteFileUploadStatus409, CompleteFileUploadStatus413 } from '../../types/CompleteFileUpload'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { completeFileUpload } from '../../clients/completeFileUpload'

export const completeFileUploadMutationKey = () => [{ url: '/file-uploads/:uploadId/completion' }] as const

export function completeFileUploadMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = completeFileUploadMutationKey()
  return mutationOptions<CompleteFileUploadStatus200, ResponseErrorConfig<CompleteFileUploadStatus400 | CompleteFileUploadStatus401 | CompleteFileUploadStatus404 | CompleteFileUploadStatus409 | CompleteFileUploadStatus413>, CompleteFileUploadOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body, headers }) => {
      return completeFileUpload({ ...config, path, body, headers, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Проверяет объект в storage по MIME, фактическому размеру и MD5, повторно применяя лимит purpose. Включительный предел для project_document равен 50000000, material_invoice — 10000000, checklist_photo — 20000000 байт. Повтор с тем же Idempotency-Key и телом возвращает тот же результат.
 * @summary Подтвердить загрузку файла
 * {@link /file-uploads/:uploadId/completion}
 */
export function useCompleteFileUpload<TContext>(options: {
  mutation?: UseMutationOptions<CompleteFileUploadStatus200, ResponseErrorConfig<CompleteFileUploadStatus400 | CompleteFileUploadStatus401 | CompleteFileUploadStatus404 | CompleteFileUploadStatus409 | CompleteFileUploadStatus413>, CompleteFileUploadOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? completeFileUploadMutationKey()

  const baseOptions = completeFileUploadMutationOptions(config) as UseMutationOptions<CompleteFileUploadStatus200, ResponseErrorConfig<CompleteFileUploadStatus400 | CompleteFileUploadStatus401 | CompleteFileUploadStatus404 | CompleteFileUploadStatus409 | CompleteFileUploadStatus413>, CompleteFileUploadOptions, TContext>

  return useMutation<CompleteFileUploadStatus200, ResponseErrorConfig<CompleteFileUploadStatus400 | CompleteFileUploadStatus401 | CompleteFileUploadStatus404 | CompleteFileUploadStatus409 | CompleteFileUploadStatus413>, CompleteFileUploadOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CompleteFileUploadStatus200, ResponseErrorConfig<CompleteFileUploadStatus400 | CompleteFileUploadStatus401 | CompleteFileUploadStatus404 | CompleteFileUploadStatus409 | CompleteFileUploadStatus413>, CompleteFileUploadOptions, TContext>
}
