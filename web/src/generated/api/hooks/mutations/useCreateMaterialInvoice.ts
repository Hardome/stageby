// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateMaterialInvoiceOptions, CreateMaterialInvoiceStatus201, CreateMaterialInvoiceStatus400, CreateMaterialInvoiceStatus401, CreateMaterialInvoiceStatus403, CreateMaterialInvoiceStatus404, CreateMaterialInvoiceStatus409 } from '../../types/CreateMaterialInvoice'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createMaterialInvoice } from '../../clients/createMaterialInvoice'

export const createMaterialInvoiceMutationKey = () => [{ url: '/material-orders/:orderId/invoices' }] as const

export function createMaterialInvoiceMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createMaterialInvoiceMutationKey()
  return mutationOptions<CreateMaterialInvoiceStatus201, ResponseErrorConfig<CreateMaterialInvoiceStatus400 | CreateMaterialInvoiceStatus401 | CreateMaterialInvoiceStatus403 | CreateMaterialInvoiceStatus404 | CreateMaterialInvoiceStatus409>, CreateMaterialInvoiceOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return createMaterialInvoice({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Требуется успешно загруженный PDF или JPEG с назначением material_invoice.
 * @summary Добавить счёт к заказу
 * @deprecated
 * {@link /material-orders/:orderId/invoices}
 */
export function useCreateMaterialInvoice<TContext>(options: {
  mutation?: UseMutationOptions<CreateMaterialInvoiceStatus201, ResponseErrorConfig<CreateMaterialInvoiceStatus400 | CreateMaterialInvoiceStatus401 | CreateMaterialInvoiceStatus403 | CreateMaterialInvoiceStatus404 | CreateMaterialInvoiceStatus409>, CreateMaterialInvoiceOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createMaterialInvoiceMutationKey()

  const baseOptions = createMaterialInvoiceMutationOptions(config) as UseMutationOptions<CreateMaterialInvoiceStatus201, ResponseErrorConfig<CreateMaterialInvoiceStatus400 | CreateMaterialInvoiceStatus401 | CreateMaterialInvoiceStatus403 | CreateMaterialInvoiceStatus404 | CreateMaterialInvoiceStatus409>, CreateMaterialInvoiceOptions, TContext>

  return useMutation<CreateMaterialInvoiceStatus201, ResponseErrorConfig<CreateMaterialInvoiceStatus400 | CreateMaterialInvoiceStatus401 | CreateMaterialInvoiceStatus403 | CreateMaterialInvoiceStatus404 | CreateMaterialInvoiceStatus409>, CreateMaterialInvoiceOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateMaterialInvoiceStatus201, ResponseErrorConfig<CreateMaterialInvoiceStatus400 | CreateMaterialInvoiceStatus401 | CreateMaterialInvoiceStatus403 | CreateMaterialInvoiceStatus404 | CreateMaterialInvoiceStatus409>, CreateMaterialInvoiceOptions, TContext>
}
