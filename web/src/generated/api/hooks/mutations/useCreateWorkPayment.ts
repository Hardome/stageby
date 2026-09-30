// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateWorkPaymentOptions, CreateWorkPaymentStatus201, CreateWorkPaymentStatus400, CreateWorkPaymentStatus401, CreateWorkPaymentStatus403, CreateWorkPaymentStatus404, CreateWorkPaymentStatus409 } from '../../types/CreateWorkPayment'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createWorkPayment } from '../../clients/createWorkPayment'

export const createWorkPaymentMutationKey = () => [{ url: '/stages/:stageId/work-payments' }] as const

export function createWorkPaymentMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createWorkPaymentMutationKey()
  return mutationOptions<CreateWorkPaymentStatus201, ResponseErrorConfig<CreateWorkPaymentStatus400 | CreateWorkPaymentStatus401 | CreateWorkPaymentStatus403 | CreateWorkPaymentStatus404 | CreateWorkPaymentStatus409>, CreateWorkPaymentOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return createWorkPayment({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Сумма положительна и кратна 100 копейкам. Архивный проект изменить нельзя.
 * @summary Добавить платёж за работы
 * {@link /stages/:stageId/work-payments}
 */
export function useCreateWorkPayment<TContext>(options: {
  mutation?: UseMutationOptions<CreateWorkPaymentStatus201, ResponseErrorConfig<CreateWorkPaymentStatus400 | CreateWorkPaymentStatus401 | CreateWorkPaymentStatus403 | CreateWorkPaymentStatus404 | CreateWorkPaymentStatus409>, CreateWorkPaymentOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createWorkPaymentMutationKey()

  const baseOptions = createWorkPaymentMutationOptions(config) as UseMutationOptions<CreateWorkPaymentStatus201, ResponseErrorConfig<CreateWorkPaymentStatus400 | CreateWorkPaymentStatus401 | CreateWorkPaymentStatus403 | CreateWorkPaymentStatus404 | CreateWorkPaymentStatus409>, CreateWorkPaymentOptions, TContext>

  return useMutation<CreateWorkPaymentStatus201, ResponseErrorConfig<CreateWorkPaymentStatus400 | CreateWorkPaymentStatus401 | CreateWorkPaymentStatus403 | CreateWorkPaymentStatus404 | CreateWorkPaymentStatus409>, CreateWorkPaymentOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateWorkPaymentStatus201, ResponseErrorConfig<CreateWorkPaymentStatus400 | CreateWorkPaymentStatus401 | CreateWorkPaymentStatus403 | CreateWorkPaymentStatus404 | CreateWorkPaymentStatus409>, CreateWorkPaymentOptions, TContext>
}
