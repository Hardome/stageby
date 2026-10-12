// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { DistributeWorkPlanRowOptions, DistributeWorkPlanRowStatus200, DistributeWorkPlanRowStatus400, DistributeWorkPlanRowStatus401, DistributeWorkPlanRowStatus403, DistributeWorkPlanRowStatus404, DistributeWorkPlanRowStatus409 } from '../../types/DistributeWorkPlanRow'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { distributeWorkPlanRow } from '../../clients/distributeWorkPlanRow'

export const distributeWorkPlanRowMutationKey = () => [{ url: '/work-plan-rows/:rowId/distribute' }] as const

export function distributeWorkPlanRowMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = distributeWorkPlanRowMutationKey()
  return mutationOptions<DistributeWorkPlanRowStatus200, ResponseErrorConfig<DistributeWorkPlanRowStatus400 | DistributeWorkPlanRowStatus401 | DistributeWorkPlanRowStatus403 | DistributeWorkPlanRowStatus404 | DistributeWorkPlanRowStatus409>, DistributeWorkPlanRowOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return distributeWorkPlanRow({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Изменения доступны руководителю. Назначенный мастер читает только собственные строки. Архивный объект не изменяется.
 * @summary Распределить строку без получателя и выплат
 * {@link /work-plan-rows/:rowId/distribute}
 */
export function useDistributeWorkPlanRow<TContext>(options: {
  mutation?: UseMutationOptions<DistributeWorkPlanRowStatus200, ResponseErrorConfig<DistributeWorkPlanRowStatus400 | DistributeWorkPlanRowStatus401 | DistributeWorkPlanRowStatus403 | DistributeWorkPlanRowStatus404 | DistributeWorkPlanRowStatus409>, DistributeWorkPlanRowOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? distributeWorkPlanRowMutationKey()

  const baseOptions = distributeWorkPlanRowMutationOptions(config) as UseMutationOptions<DistributeWorkPlanRowStatus200, ResponseErrorConfig<DistributeWorkPlanRowStatus400 | DistributeWorkPlanRowStatus401 | DistributeWorkPlanRowStatus403 | DistributeWorkPlanRowStatus404 | DistributeWorkPlanRowStatus409>, DistributeWorkPlanRowOptions, TContext>

  return useMutation<DistributeWorkPlanRowStatus200, ResponseErrorConfig<DistributeWorkPlanRowStatus400 | DistributeWorkPlanRowStatus401 | DistributeWorkPlanRowStatus403 | DistributeWorkPlanRowStatus404 | DistributeWorkPlanRowStatus409>, DistributeWorkPlanRowOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<DistributeWorkPlanRowStatus200, ResponseErrorConfig<DistributeWorkPlanRowStatus400 | DistributeWorkPlanRowStatus401 | DistributeWorkPlanRowStatus403 | DistributeWorkPlanRowStatus404 | DistributeWorkPlanRowStatus409>, DistributeWorkPlanRowOptions, TContext>
}
