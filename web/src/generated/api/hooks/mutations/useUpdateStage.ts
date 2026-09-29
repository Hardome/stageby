// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateStageOptions, UpdateStageStatus200, UpdateStageStatus400, UpdateStageStatus401, UpdateStageStatus403, UpdateStageStatus404, UpdateStageStatus409 } from '../../types/UpdateStage'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateStage } from '../../clients/updateStage'

export const updateStageMutationKey = () => [{ url: '/stages/:stageId' }] as const

export function updateStageMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateStageMutationKey()
  return mutationOptions<UpdateStageStatus200, ResponseErrorConfig<UpdateStageStatus400 | UpdateStageStatus401 | UpdateStageStatus403 | UpdateStageStatus404 | UpdateStageStatus409>, UpdateStageOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateStage({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Руководитель меняет все входные поля. Инженер — workSubtypes, плановые даты и notes. Назначенный мастер — только notes. Приёмщик — чтение. Назначать можно только активного foreman и активного inspector. Первое назначение автоматически переводит created в assigned; снятие допускается только из assigned и возвращает created. В supplied/in_progress/acceptance/rework мастер обязателен, допускается его замена руководителем. completed и paid неизменяемы. После начала работ зависимости не меняются. Плановое окончание не раньше начала, сравнивается результирующая запись после PATCH. Предшественники — этапы того же проекта, без себя и циклов; проверка графа и запись выполняются атомарно. Удаление назначенного приёмщика во время acceptance запрещено. Архив — 409 project_archived. Передача запрещённого роли поля — 403, весь запрос отклоняется.
 * @summary Настроить этап
 * {@link /stages/:stageId}
 */
export function useUpdateStage<TContext>(options: {
  mutation?: UseMutationOptions<UpdateStageStatus200, ResponseErrorConfig<UpdateStageStatus400 | UpdateStageStatus401 | UpdateStageStatus403 | UpdateStageStatus404 | UpdateStageStatus409>, UpdateStageOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateStageMutationKey()

  const baseOptions = updateStageMutationOptions(config) as UseMutationOptions<UpdateStageStatus200, ResponseErrorConfig<UpdateStageStatus400 | UpdateStageStatus401 | UpdateStageStatus403 | UpdateStageStatus404 | UpdateStageStatus409>, UpdateStageOptions, TContext>

  return useMutation<UpdateStageStatus200, ResponseErrorConfig<UpdateStageStatus400 | UpdateStageStatus401 | UpdateStageStatus403 | UpdateStageStatus404 | UpdateStageStatus409>, UpdateStageOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateStageStatus200, ResponseErrorConfig<UpdateStageStatus400 | UpdateStageStatus401 | UpdateStageStatus403 | UpdateStageStatus404 | UpdateStageStatus409>, UpdateStageOptions, TContext>
}
