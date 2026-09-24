// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateChecklistItemOptions, UpdateChecklistItemStatus200, UpdateChecklistItemStatus400, UpdateChecklistItemStatus401, UpdateChecklistItemStatus403, UpdateChecklistItemStatus404, UpdateChecklistItemStatus409 } from '../../types/UpdateChecklistItem'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateChecklistItem } from '../../clients/updateChecklistItem'

export const updateChecklistItemMutationKey = () => [{ url: '/stages/:stageId/checklist/items/:itemId' }] as const

export function updateChecklistItemMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateChecklistItemMutationKey()
  return mutationOptions<UpdateChecklistItemStatus200, ResponseErrorConfig<UpdateChecklistItemStatus400 | UpdateChecklistItemStatus401 | UpdateChecklistItemStatus403 | UpdateChecklistItemStatus404 | UpdateChecklistItemStatus409>, UpdateChecklistItemOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateChecklistItem({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Руководитель или назначенный мастер, только в in_progress. Фотографии не требуются и не принимаются в текущей версии. itemId должен принадлежать чек-листу данного этапа, иначе 404. expectedVersion — версия всего чек-листа. false→true устанавливает completedAt и completedBy на сервере; true→false очищает их. Повтор текущего значения с актуальной версией — без изменений. Пересчитывает прогресс и атомарно увеличивает версии чек-листа и этапа. 100% не меняет статус автоматически. Приёмка и completed блокируют отметки; архив — 409 project_archived.
 * @summary Отметить или снять выполнение пункта
 * {@link /stages/:stageId/checklist/items/:itemId}
 */
export function useUpdateChecklistItem<TContext>(options: {
  mutation?: UseMutationOptions<UpdateChecklistItemStatus200, ResponseErrorConfig<UpdateChecklistItemStatus400 | UpdateChecklistItemStatus401 | UpdateChecklistItemStatus403 | UpdateChecklistItemStatus404 | UpdateChecklistItemStatus409>, UpdateChecklistItemOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateChecklistItemMutationKey()

  const baseOptions = updateChecklistItemMutationOptions(config) as UseMutationOptions<UpdateChecklistItemStatus200, ResponseErrorConfig<UpdateChecklistItemStatus400 | UpdateChecklistItemStatus401 | UpdateChecklistItemStatus403 | UpdateChecklistItemStatus404 | UpdateChecklistItemStatus409>, UpdateChecklistItemOptions, TContext>

  return useMutation<UpdateChecklistItemStatus200, ResponseErrorConfig<UpdateChecklistItemStatus400 | UpdateChecklistItemStatus401 | UpdateChecklistItemStatus403 | UpdateChecklistItemStatus404 | UpdateChecklistItemStatus409>, UpdateChecklistItemOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateChecklistItemStatus200, ResponseErrorConfig<UpdateChecklistItemStatus400 | UpdateChecklistItemStatus401 | UpdateChecklistItemStatus403 | UpdateChecklistItemStatus404 | UpdateChecklistItemStatus409>, UpdateChecklistItemOptions, TContext>
}
