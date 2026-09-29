// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ReturnStageForReworkOptions, ReturnStageForReworkStatus200, ReturnStageForReworkStatus400, ReturnStageForReworkStatus401, ReturnStageForReworkStatus403, ReturnStageForReworkStatus404, ReturnStageForReworkStatus409 } from '../../types/ReturnStageForRework'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { returnStageForRework } from '../../clients/returnStageForRework'

export const returnStageForReworkMutationKey = () => [{ url: '/stages/:stageId/rework' }] as const

export function returnStageForReworkMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = returnStageForReworkMutationKey()
  return mutationOptions<ReturnStageForReworkStatus200, ResponseErrorConfig<ReturnStageForReworkStatus400 | ReturnStageForReworkStatus401 | ReturnStageForReworkStatus403 | ReturnStageForReworkStatus404 | ReturnStageForReworkStatus409>, ReturnStageForReworkOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return returnStageForRework({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Только из acceptance. Замечание, дата исправления и itemIds обязательны; дата не раньше текущей даты объекта. Интерфейс может предложить сегодня + 2 календарных дня, сервер не угадывает срок. Все itemIds должны принадлежать этому чек-листу, иначе 400 invalid_request. Переводит в rework, пишет latestAcceptance с decision=rejected и сбрасывает только указанные пункты для повторной проверки (completedAt/completedBy=null), остальные отметки сохраняет. Увеличивает версии этапа и чек-листа атомарно. Архив — 409 project_archived.
 * @summary Вернуть этап на доработку
 * {@link /stages/:stageId/rework}
 */
export function useReturnStageForRework<TContext>(options: {
  mutation?: UseMutationOptions<ReturnStageForReworkStatus200, ResponseErrorConfig<ReturnStageForReworkStatus400 | ReturnStageForReworkStatus401 | ReturnStageForReworkStatus403 | ReturnStageForReworkStatus404 | ReturnStageForReworkStatus409>, ReturnStageForReworkOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? returnStageForReworkMutationKey()

  const baseOptions = returnStageForReworkMutationOptions(config) as UseMutationOptions<ReturnStageForReworkStatus200, ResponseErrorConfig<ReturnStageForReworkStatus400 | ReturnStageForReworkStatus401 | ReturnStageForReworkStatus403 | ReturnStageForReworkStatus404 | ReturnStageForReworkStatus409>, ReturnStageForReworkOptions, TContext>

  return useMutation<ReturnStageForReworkStatus200, ResponseErrorConfig<ReturnStageForReworkStatus400 | ReturnStageForReworkStatus401 | ReturnStageForReworkStatus403 | ReturnStageForReworkStatus404 | ReturnStageForReworkStatus409>, ReturnStageForReworkOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<ReturnStageForReworkStatus200, ResponseErrorConfig<ReturnStageForReworkStatus400 | ReturnStageForReworkStatus401 | ReturnStageForReworkStatus403 | ReturnStageForReworkStatus404 | ReturnStageForReworkStatus409>, ReturnStageForReworkOptions, TContext>
}
