// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { DeleteWorkPlanRowOptions, DeleteWorkPlanRowStatus204, DeleteWorkPlanRowStatus400, DeleteWorkPlanRowStatus401, DeleteWorkPlanRowStatus403, DeleteWorkPlanRowStatus404, DeleteWorkPlanRowStatus409 } from '../../types/DeleteWorkPlanRow'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { deleteWorkPlanRow } from '../../clients/deleteWorkPlanRow'

export const deleteWorkPlanRowMutationKey = () => [{ url: '/work-plan-rows/:rowId' }] as const

export function deleteWorkPlanRowMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = deleteWorkPlanRowMutationKey()
  return mutationOptions<DeleteWorkPlanRowStatus204, ResponseErrorConfig<DeleteWorkPlanRowStatus400 | DeleteWorkPlanRowStatus401 | DeleteWorkPlanRowStatus403 | DeleteWorkPlanRowStatus404 | DeleteWorkPlanRowStatus409>, DeleteWorkPlanRowOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return deleteWorkPlanRow({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Изменения доступны руководителю. Назначенный мастер читает только собственные строки. Архивный объект не изменяется.
 * @summary Удалить строку без выплат
 * {@link /work-plan-rows/:rowId}
 */
export function useDeleteWorkPlanRow<TContext>(options: {
  mutation?: UseMutationOptions<DeleteWorkPlanRowStatus204, ResponseErrorConfig<DeleteWorkPlanRowStatus400 | DeleteWorkPlanRowStatus401 | DeleteWorkPlanRowStatus403 | DeleteWorkPlanRowStatus404 | DeleteWorkPlanRowStatus409>, DeleteWorkPlanRowOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? deleteWorkPlanRowMutationKey()

  const baseOptions = deleteWorkPlanRowMutationOptions(config) as UseMutationOptions<DeleteWorkPlanRowStatus204, ResponseErrorConfig<DeleteWorkPlanRowStatus400 | DeleteWorkPlanRowStatus401 | DeleteWorkPlanRowStatus403 | DeleteWorkPlanRowStatus404 | DeleteWorkPlanRowStatus409>, DeleteWorkPlanRowOptions, TContext>

  return useMutation<DeleteWorkPlanRowStatus204, ResponseErrorConfig<DeleteWorkPlanRowStatus400 | DeleteWorkPlanRowStatus401 | DeleteWorkPlanRowStatus403 | DeleteWorkPlanRowStatus404 | DeleteWorkPlanRowStatus409>, DeleteWorkPlanRowOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<DeleteWorkPlanRowStatus204, ResponseErrorConfig<DeleteWorkPlanRowStatus400 | DeleteWorkPlanRowStatus401 | DeleteWorkPlanRowStatus403 | DeleteWorkPlanRowStatus404 | DeleteWorkPlanRowStatus409>, DeleteWorkPlanRowOptions, TContext>
}
