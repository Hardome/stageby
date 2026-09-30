// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { DeleteWorkPaymentOptions, DeleteWorkPaymentStatus204, DeleteWorkPaymentStatus400, DeleteWorkPaymentStatus401, DeleteWorkPaymentStatus403, DeleteWorkPaymentStatus404, DeleteWorkPaymentStatus409 } from '../../types/DeleteWorkPayment'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { deleteWorkPayment } from '../../clients/deleteWorkPayment'

export const deleteWorkPaymentMutationKey = () => [{ url: '/work-payments/:paymentId' }] as const

export function deleteWorkPaymentMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = deleteWorkPaymentMutationKey()
  return mutationOptions<DeleteWorkPaymentStatus204, ResponseErrorConfig<DeleteWorkPaymentStatus400 | DeleteWorkPaymentStatus401 | DeleteWorkPaymentStatus403 | DeleteWorkPaymentStatus404 | DeleteWorkPaymentStatus409>, DeleteWorkPaymentOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return deleteWorkPayment({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. expectedVersion передаётся в теле и защищает от конкурентного удаления. Архивный проект изменить нельзя.
 * @summary Удалить платёж за работы
 * {@link /work-payments/:paymentId}
 */
export function useDeleteWorkPayment<TContext>(options: {
  mutation?: UseMutationOptions<DeleteWorkPaymentStatus204, ResponseErrorConfig<DeleteWorkPaymentStatus400 | DeleteWorkPaymentStatus401 | DeleteWorkPaymentStatus403 | DeleteWorkPaymentStatus404 | DeleteWorkPaymentStatus409>, DeleteWorkPaymentOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? deleteWorkPaymentMutationKey()

  const baseOptions = deleteWorkPaymentMutationOptions(config) as UseMutationOptions<DeleteWorkPaymentStatus204, ResponseErrorConfig<DeleteWorkPaymentStatus400 | DeleteWorkPaymentStatus401 | DeleteWorkPaymentStatus403 | DeleteWorkPaymentStatus404 | DeleteWorkPaymentStatus409>, DeleteWorkPaymentOptions, TContext>

  return useMutation<DeleteWorkPaymentStatus204, ResponseErrorConfig<DeleteWorkPaymentStatus400 | DeleteWorkPaymentStatus401 | DeleteWorkPaymentStatus403 | DeleteWorkPaymentStatus404 | DeleteWorkPaymentStatus409>, DeleteWorkPaymentOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<DeleteWorkPaymentStatus204, ResponseErrorConfig<DeleteWorkPaymentStatus400 | DeleteWorkPaymentStatus401 | DeleteWorkPaymentStatus403 | DeleteWorkPaymentStatus404 | DeleteWorkPaymentStatus409>, DeleteWorkPaymentOptions, TContext>
}
