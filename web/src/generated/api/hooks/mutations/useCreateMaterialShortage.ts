// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateMaterialShortageOptions, CreateMaterialShortageStatus201, CreateMaterialShortageStatus400, CreateMaterialShortageStatus401, CreateMaterialShortageStatus403, CreateMaterialShortageStatus404, CreateMaterialShortageStatus409 } from '../../types/CreateMaterialShortage'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createMaterialShortage } from '../../clients/createMaterialShortage'

export const createMaterialShortageMutationKey = () => [{ url: '/material-invoices/:invoiceId/shortages' }] as const

export function createMaterialShortageMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createMaterialShortageMutationKey()
  return mutationOptions<CreateMaterialShortageStatus201, ResponseErrorConfig<CreateMaterialShortageStatus400 | CreateMaterialShortageStatus401 | CreateMaterialShortageStatus403 | CreateMaterialShortageStatus404 | CreateMaterialShortageStatus409>, CreateMaterialShortageOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return createMaterialShortage({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Руководитель или назначенный мастер. Добавление нового счёта не закрывает нехватку.
 * @summary Сообщить о нехватке
 * {@link /material-invoices/:invoiceId/shortages}
 */
export function useCreateMaterialShortage<TContext>(options: {
  mutation?: UseMutationOptions<CreateMaterialShortageStatus201, ResponseErrorConfig<CreateMaterialShortageStatus400 | CreateMaterialShortageStatus401 | CreateMaterialShortageStatus403 | CreateMaterialShortageStatus404 | CreateMaterialShortageStatus409>, CreateMaterialShortageOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createMaterialShortageMutationKey()

  const baseOptions = createMaterialShortageMutationOptions(config) as UseMutationOptions<CreateMaterialShortageStatus201, ResponseErrorConfig<CreateMaterialShortageStatus400 | CreateMaterialShortageStatus401 | CreateMaterialShortageStatus403 | CreateMaterialShortageStatus404 | CreateMaterialShortageStatus409>, CreateMaterialShortageOptions, TContext>

  return useMutation<CreateMaterialShortageStatus201, ResponseErrorConfig<CreateMaterialShortageStatus400 | CreateMaterialShortageStatus401 | CreateMaterialShortageStatus403 | CreateMaterialShortageStatus404 | CreateMaterialShortageStatus409>, CreateMaterialShortageOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateMaterialShortageStatus201, ResponseErrorConfig<CreateMaterialShortageStatus400 | CreateMaterialShortageStatus401 | CreateMaterialShortageStatus403 | CreateMaterialShortageStatus404 | CreateMaterialShortageStatus409>, CreateMaterialShortageOptions, TContext>
}
