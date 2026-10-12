// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateWorkPlanRowOptions, UpdateWorkPlanRowStatus200, UpdateWorkPlanRowStatus400, UpdateWorkPlanRowStatus401, UpdateWorkPlanRowStatus403, UpdateWorkPlanRowStatus404, UpdateWorkPlanRowStatus409 } from '../../types/UpdateWorkPlanRow'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateWorkPlanRow } from '../../clients/updateWorkPlanRow'

export const updateWorkPlanRowMutationKey = () => [{ url: '/work-plan-rows/:rowId' }] as const

export function updateWorkPlanRowMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateWorkPlanRowMutationKey()
  return mutationOptions<UpdateWorkPlanRowStatus200, ResponseErrorConfig<UpdateWorkPlanRowStatus400 | UpdateWorkPlanRowStatus401 | UpdateWorkPlanRowStatus403 | UpdateWorkPlanRowStatus404 | UpdateWorkPlanRowStatus409>, UpdateWorkPlanRowOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateWorkPlanRow({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Изменения доступны руководителю. Назначенный мастер читает только собственные строки. Архивный объект не изменяется.
 * @summary Изменить строку выплаты
 * {@link /work-plan-rows/:rowId}
 */
export function useUpdateWorkPlanRow<TContext>(options: {
  mutation?: UseMutationOptions<UpdateWorkPlanRowStatus200, ResponseErrorConfig<UpdateWorkPlanRowStatus400 | UpdateWorkPlanRowStatus401 | UpdateWorkPlanRowStatus403 | UpdateWorkPlanRowStatus404 | UpdateWorkPlanRowStatus409>, UpdateWorkPlanRowOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateWorkPlanRowMutationKey()

  const baseOptions = updateWorkPlanRowMutationOptions(config) as UseMutationOptions<UpdateWorkPlanRowStatus200, ResponseErrorConfig<UpdateWorkPlanRowStatus400 | UpdateWorkPlanRowStatus401 | UpdateWorkPlanRowStatus403 | UpdateWorkPlanRowStatus404 | UpdateWorkPlanRowStatus409>, UpdateWorkPlanRowOptions, TContext>

  return useMutation<UpdateWorkPlanRowStatus200, ResponseErrorConfig<UpdateWorkPlanRowStatus400 | UpdateWorkPlanRowStatus401 | UpdateWorkPlanRowStatus403 | UpdateWorkPlanRowStatus404 | UpdateWorkPlanRowStatus409>, UpdateWorkPlanRowOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateWorkPlanRowStatus200, ResponseErrorConfig<UpdateWorkPlanRowStatus400 | UpdateWorkPlanRowStatus401 | UpdateWorkPlanRowStatus403 | UpdateWorkPlanRowStatus404 | UpdateWorkPlanRowStatus409>, UpdateWorkPlanRowOptions, TContext>
}
