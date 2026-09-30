// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateMaterialOrderOptions, UpdateMaterialOrderStatus200, UpdateMaterialOrderStatus400, UpdateMaterialOrderStatus401, UpdateMaterialOrderStatus403, UpdateMaterialOrderStatus404, UpdateMaterialOrderStatus409 } from '../../types/UpdateMaterialOrder'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateMaterialOrder } from '../../clients/updateMaterialOrder'

export const updateMaterialOrderMutationKey = () => [{ url: '/material-orders/:orderId' }] as const

export function updateMaterialOrderMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateMaterialOrderMutationKey()
  return mutationOptions<UpdateMaterialOrderStatus200, ResponseErrorConfig<UpdateMaterialOrderStatus400 | UpdateMaterialOrderStatus401 | UpdateMaterialOrderStatus403 | UpdateMaterialOrderStatus404 | UpdateMaterialOrderStatus409>, UpdateMaterialOrderOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateMaterialOrder({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Дата и автор отправки фиксируются сервером.
 * @summary Изменить отправку заказа
 * {@link /material-orders/:orderId}
 */
export function useUpdateMaterialOrder<TContext>(options: {
  mutation?: UseMutationOptions<UpdateMaterialOrderStatus200, ResponseErrorConfig<UpdateMaterialOrderStatus400 | UpdateMaterialOrderStatus401 | UpdateMaterialOrderStatus403 | UpdateMaterialOrderStatus404 | UpdateMaterialOrderStatus409>, UpdateMaterialOrderOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateMaterialOrderMutationKey()

  const baseOptions = updateMaterialOrderMutationOptions(config) as UseMutationOptions<UpdateMaterialOrderStatus200, ResponseErrorConfig<UpdateMaterialOrderStatus400 | UpdateMaterialOrderStatus401 | UpdateMaterialOrderStatus403 | UpdateMaterialOrderStatus404 | UpdateMaterialOrderStatus409>, UpdateMaterialOrderOptions, TContext>

  return useMutation<UpdateMaterialOrderStatus200, ResponseErrorConfig<UpdateMaterialOrderStatus400 | UpdateMaterialOrderStatus401 | UpdateMaterialOrderStatus403 | UpdateMaterialOrderStatus404 | UpdateMaterialOrderStatus409>, UpdateMaterialOrderOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateMaterialOrderStatus200, ResponseErrorConfig<UpdateMaterialOrderStatus400 | UpdateMaterialOrderStatus401 | UpdateMaterialOrderStatus403 | UpdateMaterialOrderStatus404 | UpdateMaterialOrderStatus409>, UpdateMaterialOrderOptions, TContext>
}
