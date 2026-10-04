// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { DeleteChecklistItemPhotoOptions, DeleteChecklistItemPhotoStatus204, DeleteChecklistItemPhotoStatus400, DeleteChecklistItemPhotoStatus401, DeleteChecklistItemPhotoStatus403, DeleteChecklistItemPhotoStatus404, DeleteChecklistItemPhotoStatus409 } from '../../types/DeleteChecklistItemPhoto'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { deleteChecklistItemPhoto } from '../../clients/deleteChecklistItemPhoto'

export const deleteChecklistItemPhotoMutationKey = () => [{ url: '/checklist/photos/:photoId' }] as const

export function deleteChecklistItemPhotoMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = deleteChecklistItemPhotoMutationKey()
  return mutationOptions<DeleteChecklistItemPhotoStatus204, ResponseErrorConfig<DeleteChecklistItemPhotoStatus400 | DeleteChecklistItemPhotoStatus401 | DeleteChecklistItemPhotoStatus403 | DeleteChecklistItemPhotoStatus404 | DeleteChecklistItemPhotoStatus409>, DeleteChecklistItemPhotoOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, query }) => {
      return deleteChecklistItemPhoto({ ...config, path, query, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Помечает фото удалённым. Если это последнее активное фото выполненного пункта, требуется confirmLastPhotoDeletion=true, иначе 409 photo_deletion_confirmation_required. Подтверждённое удаление снимает выполнение и пересчитывает прогресс и версии в той же транзакции. Мастер на приёмке имеет только доступ для чтения; при доработке меняет только возвращённые пункты. completed и paid запрещают изменения для всех ролей.
 * @summary Удалить фотографию пункта
 * {@link /checklist/photos/:photoId}
 */
export function useDeleteChecklistItemPhoto<TContext>(options: {
  mutation?: UseMutationOptions<DeleteChecklistItemPhotoStatus204, ResponseErrorConfig<DeleteChecklistItemPhotoStatus400 | DeleteChecklistItemPhotoStatus401 | DeleteChecklistItemPhotoStatus403 | DeleteChecklistItemPhotoStatus404 | DeleteChecklistItemPhotoStatus409>, DeleteChecklistItemPhotoOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? deleteChecklistItemPhotoMutationKey()

  const baseOptions = deleteChecklistItemPhotoMutationOptions(config) as UseMutationOptions<DeleteChecklistItemPhotoStatus204, ResponseErrorConfig<DeleteChecklistItemPhotoStatus400 | DeleteChecklistItemPhotoStatus401 | DeleteChecklistItemPhotoStatus403 | DeleteChecklistItemPhotoStatus404 | DeleteChecklistItemPhotoStatus409>, DeleteChecklistItemPhotoOptions, TContext>

  return useMutation<DeleteChecklistItemPhotoStatus204, ResponseErrorConfig<DeleteChecklistItemPhotoStatus400 | DeleteChecklistItemPhotoStatus401 | DeleteChecklistItemPhotoStatus403 | DeleteChecklistItemPhotoStatus404 | DeleteChecklistItemPhotoStatus409>, DeleteChecklistItemPhotoOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<DeleteChecklistItemPhotoStatus204, ResponseErrorConfig<DeleteChecklistItemPhotoStatus400 | DeleteChecklistItemPhotoStatus401 | DeleteChecklistItemPhotoStatus403 | DeleteChecklistItemPhotoStatus404 | DeleteChecklistItemPhotoStatus409>, DeleteChecklistItemPhotoOptions, TContext>
}
