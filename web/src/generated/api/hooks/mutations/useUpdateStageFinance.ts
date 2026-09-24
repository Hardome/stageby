// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateStageFinanceOptions, UpdateStageFinanceStatus200, UpdateStageFinanceStatus400, UpdateStageFinanceStatus401, UpdateStageFinanceStatus403, UpdateStageFinanceStatus404, UpdateStageFinanceStatus409 } from '../../types/UpdateStageFinance'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateStageFinance } from '../../clients/updateStageFinance'

export const updateStageFinanceMutationKey = () => [{ url: '/stages/:stageId/finance' }] as const

export function updateStageFinanceMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateStageFinanceMutationKey()
  return mutationOptions<UpdateStageFinanceStatus200, ResponseErrorConfig<UpdateStageFinanceStatus400 | UpdateStageFinanceStatus401 | UpdateStageFinanceStatus403 | UpdateStageFinanceStatus404 | UpdateStageFinanceStatus409>, UpdateStageFinanceOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateStageFinance({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Вручную задаёт четыре суммы в копейках RUB. null очищает неизвестную сумму, 0 означает введённый ноль. Не формирует платежи, не меняет рабочий статус и публичную версию этапа. Разрешено после приёмки; архив — 409 project_archived. Все изменения атомарны, версия финансов увеличивается.
 * @summary Внести плановые и фактические затраты
 * {@link /stages/:stageId/finance}
 */
export function useUpdateStageFinance<TContext>(options: {
  mutation?: UseMutationOptions<UpdateStageFinanceStatus200, ResponseErrorConfig<UpdateStageFinanceStatus400 | UpdateStageFinanceStatus401 | UpdateStageFinanceStatus403 | UpdateStageFinanceStatus404 | UpdateStageFinanceStatus409>, UpdateStageFinanceOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateStageFinanceMutationKey()

  const baseOptions = updateStageFinanceMutationOptions(config) as UseMutationOptions<UpdateStageFinanceStatus200, ResponseErrorConfig<UpdateStageFinanceStatus400 | UpdateStageFinanceStatus401 | UpdateStageFinanceStatus403 | UpdateStageFinanceStatus404 | UpdateStageFinanceStatus409>, UpdateStageFinanceOptions, TContext>

  return useMutation<UpdateStageFinanceStatus200, ResponseErrorConfig<UpdateStageFinanceStatus400 | UpdateStageFinanceStatus401 | UpdateStageFinanceStatus403 | UpdateStageFinanceStatus404 | UpdateStageFinanceStatus409>, UpdateStageFinanceOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateStageFinanceStatus200, ResponseErrorConfig<UpdateStageFinanceStatus400 | UpdateStageFinanceStatus401 | UpdateStageFinanceStatus403 | UpdateStageFinanceStatus404 | UpdateStageFinanceStatus409>, UpdateStageFinanceOptions, TContext>
}
