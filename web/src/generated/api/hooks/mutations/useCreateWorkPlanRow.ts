// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateWorkPlanRowOptions, CreateWorkPlanRowStatus201, CreateWorkPlanRowStatus400, CreateWorkPlanRowStatus401, CreateWorkPlanRowStatus403, CreateWorkPlanRowStatus404, CreateWorkPlanRowStatus409 } from '../../types/CreateWorkPlanRow'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createWorkPlanRow } from '../../clients/createWorkPlanRow'

export const createWorkPlanRowMutationKey = () => [{ url: '/stages/:stageId/work-plan-rows' }] as const

export function createWorkPlanRowMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createWorkPlanRowMutationKey()
  return mutationOptions<CreateWorkPlanRowStatus201, ResponseErrorConfig<CreateWorkPlanRowStatus400 | CreateWorkPlanRowStatus401 | CreateWorkPlanRowStatus403 | CreateWorkPlanRowStatus404 | CreateWorkPlanRowStatus409>, CreateWorkPlanRowOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return createWorkPlanRow({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Изменения доступны руководителю. Назначенный мастер читает только собственные строки. Архивный объект не изменяется.
 * @summary Добавить строку выплаты
 * {@link /stages/:stageId/work-plan-rows}
 */
export function useCreateWorkPlanRow<TContext>(options: {
  mutation?: UseMutationOptions<CreateWorkPlanRowStatus201, ResponseErrorConfig<CreateWorkPlanRowStatus400 | CreateWorkPlanRowStatus401 | CreateWorkPlanRowStatus403 | CreateWorkPlanRowStatus404 | CreateWorkPlanRowStatus409>, CreateWorkPlanRowOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createWorkPlanRowMutationKey()

  const baseOptions = createWorkPlanRowMutationOptions(config) as UseMutationOptions<CreateWorkPlanRowStatus201, ResponseErrorConfig<CreateWorkPlanRowStatus400 | CreateWorkPlanRowStatus401 | CreateWorkPlanRowStatus403 | CreateWorkPlanRowStatus404 | CreateWorkPlanRowStatus409>, CreateWorkPlanRowOptions, TContext>

  return useMutation<CreateWorkPlanRowStatus201, ResponseErrorConfig<CreateWorkPlanRowStatus400 | CreateWorkPlanRowStatus401 | CreateWorkPlanRowStatus403 | CreateWorkPlanRowStatus404 | CreateWorkPlanRowStatus409>, CreateWorkPlanRowOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateWorkPlanRowStatus201, ResponseErrorConfig<CreateWorkPlanRowStatus400 | CreateWorkPlanRowStatus401 | CreateWorkPlanRowStatus403 | CreateWorkPlanRowStatus404 | CreateWorkPlanRowStatus409>, CreateWorkPlanRowOptions, TContext>
}
