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
 * @description Только руководитель. Можно передать любое непустое сочетание полей; все проверки выполняются по результирующей записи, изменения атомарны и увеличивают version один раз. Назначать можно только активного foreman; null снимает назначение. Даты, мастер и ручные планы редактируются после старта, включая completed и paid; фактические даты сохраняются. Для paid план работ должен оставаться заданным, а остаток работ — не больше нуля, иначе возвращается 409 invalid_transition без изменения статуса. Даты независимо nullable; каждая заданная дата находится внутри обеих границ проекта, окончание не раньше начала при наличии обеих дат; соседние этапы не переносятся. Устаревшая expectedVersion — 409 version_conflict, архив — 409 project_archived.
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
