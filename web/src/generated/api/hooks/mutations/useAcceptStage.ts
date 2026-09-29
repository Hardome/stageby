// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { AcceptStageOptions, AcceptStageStatus200, AcceptStageStatus400, AcceptStageStatus401, AcceptStageStatus403, AcceptStageStatus404, AcceptStageStatus409 } from '../../types/AcceptStage'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { acceptStage } from '../../clients/acceptStage'

export const acceptStageMutationKey = () => [{ url: '/stages/:stageId/acceptance' }] as const

export function acceptStageMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = acceptStageMutationKey()
  return mutationOptions<AcceptStageStatus200, ResponseErrorConfig<AcceptStageStatus400 | AcceptStageStatus401 | AcceptStageStatus403 | AcceptStageStatus404 | AcceptStageStatus409>, AcceptStageOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return acceptStage({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Только из acceptance, при всех выполненных пунктах. Атомарно записывает latestAcceptance с decision=accepted, текущим пользователем, временем и correctionDueDate=null; переводит этап в completed и устанавливает actualEndDate. Это электронная отметка приёмки, не PDF и не юридически значимая подпись. Архив — 409 project_archived.
 * @summary Принять этап
 * {@link /stages/:stageId/acceptance}
 */
export function useAcceptStage<TContext>(options: {
  mutation?: UseMutationOptions<AcceptStageStatus200, ResponseErrorConfig<AcceptStageStatus400 | AcceptStageStatus401 | AcceptStageStatus403 | AcceptStageStatus404 | AcceptStageStatus409>, AcceptStageOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? acceptStageMutationKey()

  const baseOptions = acceptStageMutationOptions(config) as UseMutationOptions<AcceptStageStatus200, ResponseErrorConfig<AcceptStageStatus400 | AcceptStageStatus401 | AcceptStageStatus403 | AcceptStageStatus404 | AcceptStageStatus409>, AcceptStageOptions, TContext>

  return useMutation<AcceptStageStatus200, ResponseErrorConfig<AcceptStageStatus400 | AcceptStageStatus401 | AcceptStageStatus403 | AcceptStageStatus404 | AcceptStageStatus409>, AcceptStageOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<AcceptStageStatus200, ResponseErrorConfig<AcceptStageStatus400 | AcceptStageStatus401 | AcceptStageStatus403 | AcceptStageStatus404 | AcceptStageStatus409>, AcceptStageOptions, TContext>
}
