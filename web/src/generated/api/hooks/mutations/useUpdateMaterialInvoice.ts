// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateMaterialInvoiceOptions, UpdateMaterialInvoiceStatus200, UpdateMaterialInvoiceStatus400, UpdateMaterialInvoiceStatus401, UpdateMaterialInvoiceStatus403, UpdateMaterialInvoiceStatus404, UpdateMaterialInvoiceStatus409, UpdateMaterialInvoiceStatus413 } from '../../types/UpdateMaterialInvoice'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateMaterialInvoice } from '../../clients/updateMaterialInvoice'

export const updateMaterialInvoiceMutationKey = () => [{ url: '/material-invoices/:invoiceId' }] as const

export function updateMaterialInvoiceMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateMaterialInvoiceMutationKey()
  return mutationOptions<UpdateMaterialInvoiceStatus200, ResponseErrorConfig<UpdateMaterialInvoiceStatus400 | UpdateMaterialInvoiceStatus401 | UpdateMaterialInvoiceStatus403 | UpdateMaterialInvoiceStatus404 | UpdateMaterialInvoiceStatus409 | UpdateMaterialInvoiceStatus413>, UpdateMaterialInvoiceOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateMaterialInvoice({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Реквизиты, файл и оплату меняет только руководитель. Доставку — руководитель или назначенный мастер. Замена файла подчиняется правилам создания счёта. Изменение реквизитов сохраняет оплату, доставку и нехватки. Архивный проект и исключённый этап изменять нельзя.
 * @summary Изменить счёт, оплату или доставку
 * {@link /material-invoices/:invoiceId}
 */
export function useUpdateMaterialInvoice<TContext>(options: {
  mutation?: UseMutationOptions<UpdateMaterialInvoiceStatus200, ResponseErrorConfig<UpdateMaterialInvoiceStatus400 | UpdateMaterialInvoiceStatus401 | UpdateMaterialInvoiceStatus403 | UpdateMaterialInvoiceStatus404 | UpdateMaterialInvoiceStatus409 | UpdateMaterialInvoiceStatus413>, UpdateMaterialInvoiceOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateMaterialInvoiceMutationKey()

  const baseOptions = updateMaterialInvoiceMutationOptions(config) as UseMutationOptions<UpdateMaterialInvoiceStatus200, ResponseErrorConfig<UpdateMaterialInvoiceStatus400 | UpdateMaterialInvoiceStatus401 | UpdateMaterialInvoiceStatus403 | UpdateMaterialInvoiceStatus404 | UpdateMaterialInvoiceStatus409 | UpdateMaterialInvoiceStatus413>, UpdateMaterialInvoiceOptions, TContext>

  return useMutation<UpdateMaterialInvoiceStatus200, ResponseErrorConfig<UpdateMaterialInvoiceStatus400 | UpdateMaterialInvoiceStatus401 | UpdateMaterialInvoiceStatus403 | UpdateMaterialInvoiceStatus404 | UpdateMaterialInvoiceStatus409 | UpdateMaterialInvoiceStatus413>, UpdateMaterialInvoiceOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateMaterialInvoiceStatus200, ResponseErrorConfig<UpdateMaterialInvoiceStatus400 | UpdateMaterialInvoiceStatus401 | UpdateMaterialInvoiceStatus403 | UpdateMaterialInvoiceStatus404 | UpdateMaterialInvoiceStatus409 | UpdateMaterialInvoiceStatus413>, UpdateMaterialInvoiceOptions, TContext>
}
