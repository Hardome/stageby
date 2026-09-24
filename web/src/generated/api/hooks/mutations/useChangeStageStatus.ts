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
 * @description Руководитель или назначенный мастер. Разрешены assigned→supplied→started→in_progress→acceptance. Повтор того же статуса с актуальной версией возвращает запись без изменения. Пропуск или обратный переход — 409 invalid_transition. Для started нужны активный мастер, чек-лист из 3–4 пунктов и completed у всех предшественников; actualStartDate устанавливает сервер. Для acceptance нужны все выполненные пункты и активный назначенный приёмщик. supplied отмечается вручную, учёт материалов пока отсутствует. Возврат на доработку и завершение выполняются только методами приёмки. Архив — 409 project_archived.
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
