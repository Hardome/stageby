// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { DeleteMaterialInvoiceOptions, DeleteMaterialInvoiceStatus204, DeleteMaterialInvoiceStatus400, DeleteMaterialInvoiceStatus401, DeleteMaterialInvoiceStatus403, DeleteMaterialInvoiceStatus404, DeleteMaterialInvoiceStatus409 } from '../../types/DeleteMaterialInvoice'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { deleteMaterialInvoice } from '../../clients/deleteMaterialInvoice'

export const deleteMaterialInvoiceMutationKey = () => [{ url: '/material-invoices/:invoiceId' }] as const

export function deleteMaterialInvoiceMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = deleteMaterialInvoiceMutationKey()
  return mutationOptions<DeleteMaterialInvoiceStatus204, ResponseErrorConfig<DeleteMaterialInvoiceStatus400 | DeleteMaterialInvoiceStatus401 | DeleteMaterialInvoiceStatus403 | DeleteMaterialInvoiceStatus404 | DeleteMaterialInvoiceStatus409>, DeleteMaterialInvoiceOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return deleteMaterialInvoice({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Удаляет счёт с оплатой, доставкой и всеми нехватками, пересчитывает итоги и состояние материалов. expectedVersion защищает от конкурентного изменения. Архивный проект и исключённый этап изменять нельзя. Файл физически не удаляется.
 * @summary Удалить счёт материалов
 * {@link /material-invoices/:invoiceId}
 */
export function useDeleteMaterialInvoice<TContext>(options: {
  mutation?: UseMutationOptions<DeleteMaterialInvoiceStatus204, ResponseErrorConfig<DeleteMaterialInvoiceStatus400 | DeleteMaterialInvoiceStatus401 | DeleteMaterialInvoiceStatus403 | DeleteMaterialInvoiceStatus404 | DeleteMaterialInvoiceStatus409>, DeleteMaterialInvoiceOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? deleteMaterialInvoiceMutationKey()

  const baseOptions = deleteMaterialInvoiceMutationOptions(config) as UseMutationOptions<DeleteMaterialInvoiceStatus204, ResponseErrorConfig<DeleteMaterialInvoiceStatus400 | DeleteMaterialInvoiceStatus401 | DeleteMaterialInvoiceStatus403 | DeleteMaterialInvoiceStatus404 | DeleteMaterialInvoiceStatus409>, DeleteMaterialInvoiceOptions, TContext>

  return useMutation<DeleteMaterialInvoiceStatus204, ResponseErrorConfig<DeleteMaterialInvoiceStatus400 | DeleteMaterialInvoiceStatus401 | DeleteMaterialInvoiceStatus403 | DeleteMaterialInvoiceStatus404 | DeleteMaterialInvoiceStatus409>, DeleteMaterialInvoiceOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<DeleteMaterialInvoiceStatus204, ResponseErrorConfig<DeleteMaterialInvoiceStatus400 | DeleteMaterialInvoiceStatus401 | DeleteMaterialInvoiceStatus403 | DeleteMaterialInvoiceStatus404 | DeleteMaterialInvoiceStatus409>, DeleteMaterialInvoiceOptions, TContext>
}
