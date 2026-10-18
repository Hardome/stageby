// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ChangeStageStatusOptions, ChangeStageStatusStatus200, ChangeStageStatusStatus400, ChangeStageStatusStatus401, ChangeStageStatusStatus403, ChangeStageStatusStatus404, ChangeStageStatusStatus409 } from '../../types/ChangeStageStatus'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { changeStageStatus } from '../../clients/changeStageStatus'

export const changeStageStatusMutationKey = () => [{ url: '/stages/:stageId/status' }] as const

export function changeStageStatusMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = changeStageStatusMutationKey()
  return mutationOptions<ChangeStageStatusStatus200, ResponseErrorConfig<ChangeStageStatusStatus400 | ChangeStageStatusStatus401 | ChangeStageStatusStatus403 | ChangeStageStatusStatus404 | ChangeStageStatusStatus409>, ChangeStageStatusOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return changeStageStatus({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Явно разрешён assigned→supplied при наличии хотя бы одного счёта этапа и доставке всех счетов. Статус paid рассчитывается автоматически после приёмки. Старт, переход на приёмку и возврат с доработки выполняются автоматически изменением пунктов. Повтор текущего статуса с актуальной версией возвращает запись без изменения. Остальные переходы — 409 invalid_transition. Архив — 409 project_archived.
 * @summary Перевести этап в следующий рабочий статус
 * {@link /stages/:stageId/status}
 */
export function useChangeStageStatus<TContext>(options: {
  mutation?: UseMutationOptions<ChangeStageStatusStatus200, ResponseErrorConfig<ChangeStageStatusStatus400 | ChangeStageStatusStatus401 | ChangeStageStatusStatus403 | ChangeStageStatusStatus404 | ChangeStageStatusStatus409>, ChangeStageStatusOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? changeStageStatusMutationKey()

  const baseOptions = changeStageStatusMutationOptions(config) as UseMutationOptions<ChangeStageStatusStatus200, ResponseErrorConfig<ChangeStageStatusStatus400 | ChangeStageStatusStatus401 | ChangeStageStatusStatus403 | ChangeStageStatusStatus404 | ChangeStageStatusStatus409>, ChangeStageStatusOptions, TContext>

  return useMutation<ChangeStageStatusStatus200, ResponseErrorConfig<ChangeStageStatusStatus400 | ChangeStageStatusStatus401 | ChangeStageStatusStatus403 | ChangeStageStatusStatus404 | ChangeStageStatusStatus409>, ChangeStageStatusOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<ChangeStageStatusStatus200, ResponseErrorConfig<ChangeStageStatusStatus400 | ChangeStageStatusStatus401 | ChangeStageStatusStatus403 | ChangeStageStatusStatus404 | ChangeStageStatusStatus409>, ChangeStageStatusOptions, TContext>
}
