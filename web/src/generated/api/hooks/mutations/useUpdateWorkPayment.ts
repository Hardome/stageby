// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateWorkPaymentOptions, UpdateWorkPaymentStatus200, UpdateWorkPaymentStatus400, UpdateWorkPaymentStatus401, UpdateWorkPaymentStatus403, UpdateWorkPaymentStatus404, UpdateWorkPaymentStatus409 } from '../../types/UpdateWorkPayment'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateWorkPayment } from '../../clients/updateWorkPayment'

export const updateWorkPaymentMutationKey = () => [{ url: '/work-payments/:paymentId' }] as const

export function updateWorkPaymentMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateWorkPaymentMutationKey()
  return mutationOptions<UpdateWorkPaymentStatus200, ResponseErrorConfig<UpdateWorkPaymentStatus400 | UpdateWorkPaymentStatus401 | UpdateWorkPaymentStatus403 | UpdateWorkPaymentStatus404 | UpdateWorkPaymentStatus409>, UpdateWorkPaymentOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateWorkPayment({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. expectedVersion защищает от конкурентного изменения. Архивный проект изменить нельзя.
 * @summary Изменить платёж за работы
 * {@link /work-payments/:paymentId}
 */
export function useUpdateWorkPayment<TContext>(options: {
  mutation?: UseMutationOptions<UpdateWorkPaymentStatus200, ResponseErrorConfig<UpdateWorkPaymentStatus400 | UpdateWorkPaymentStatus401 | UpdateWorkPaymentStatus403 | UpdateWorkPaymentStatus404 | UpdateWorkPaymentStatus409>, UpdateWorkPaymentOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateWorkPaymentMutationKey()

  const baseOptions = updateWorkPaymentMutationOptions(config) as UseMutationOptions<UpdateWorkPaymentStatus200, ResponseErrorConfig<UpdateWorkPaymentStatus400 | UpdateWorkPaymentStatus401 | UpdateWorkPaymentStatus403 | UpdateWorkPaymentStatus404 | UpdateWorkPaymentStatus409>, UpdateWorkPaymentOptions, TContext>

  return useMutation<UpdateWorkPaymentStatus200, ResponseErrorConfig<UpdateWorkPaymentStatus400 | UpdateWorkPaymentStatus401 | UpdateWorkPaymentStatus403 | UpdateWorkPaymentStatus404 | UpdateWorkPaymentStatus409>, UpdateWorkPaymentOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateWorkPaymentStatus200, ResponseErrorConfig<UpdateWorkPaymentStatus400 | UpdateWorkPaymentStatus401 | UpdateWorkPaymentStatus403 | UpdateWorkPaymentStatus404 | UpdateWorkPaymentStatus409>, UpdateWorkPaymentOptions, TContext>
}
