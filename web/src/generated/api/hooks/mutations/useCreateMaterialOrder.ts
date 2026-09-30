// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateMaterialOrderOptions, CreateMaterialOrderStatus201, CreateMaterialOrderStatus401, CreateMaterialOrderStatus403, CreateMaterialOrderStatus404, CreateMaterialOrderStatus409 } from '../../types/CreateMaterialOrder'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createMaterialOrder } from '../../clients/createMaterialOrder'

export const createMaterialOrderMutationKey = () => [{ url: '/stages/:stageId/material-orders' }] as const

export function createMaterialOrderMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createMaterialOrderMutationKey()
  return mutationOptions<CreateMaterialOrderStatus201, ResponseErrorConfig<CreateMaterialOrderStatus401 | CreateMaterialOrderStatus403 | CreateMaterialOrderStatus404 | CreateMaterialOrderStatus409>, CreateMaterialOrderOptions, TContext>({
    mutationKey,
    mutationFn: async({ path }) => {
      return createMaterialOrder({ ...config, path, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Один этап может иметь несколько заказов.
 * @summary Создать заказ материалов
 * {@link /stages/:stageId/material-orders}
 */
export function useCreateMaterialOrder<TContext>(options: {
  mutation?: UseMutationOptions<CreateMaterialOrderStatus201, ResponseErrorConfig<CreateMaterialOrderStatus401 | CreateMaterialOrderStatus403 | CreateMaterialOrderStatus404 | CreateMaterialOrderStatus409>, CreateMaterialOrderOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createMaterialOrderMutationKey()

  const baseOptions = createMaterialOrderMutationOptions(config) as UseMutationOptions<CreateMaterialOrderStatus201, ResponseErrorConfig<CreateMaterialOrderStatus401 | CreateMaterialOrderStatus403 | CreateMaterialOrderStatus404 | CreateMaterialOrderStatus409>, CreateMaterialOrderOptions, TContext>

  return useMutation<CreateMaterialOrderStatus201, ResponseErrorConfig<CreateMaterialOrderStatus401 | CreateMaterialOrderStatus403 | CreateMaterialOrderStatus404 | CreateMaterialOrderStatus409>, CreateMaterialOrderOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateMaterialOrderStatus201, ResponseErrorConfig<CreateMaterialOrderStatus401 | CreateMaterialOrderStatus403 | CreateMaterialOrderStatus404 | CreateMaterialOrderStatus409>, CreateMaterialOrderOptions, TContext>
}
