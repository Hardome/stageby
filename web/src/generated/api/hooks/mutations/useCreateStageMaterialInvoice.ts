// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateStageMaterialInvoiceOptions, CreateStageMaterialInvoiceStatus201, CreateStageMaterialInvoiceStatus400, CreateStageMaterialInvoiceStatus401, CreateStageMaterialInvoiceStatus403, CreateStageMaterialInvoiceStatus404, CreateStageMaterialInvoiceStatus409, CreateStageMaterialInvoiceStatus413 } from '../../types/CreateStageMaterialInvoice'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createStageMaterialInvoice } from '../../clients/createStageMaterialInvoice'

export const createStageMaterialInvoiceMutationKey = () => [{ url: '/stages/:stageId/material-invoices' }] as const

export function createStageMaterialInvoiceMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createStageMaterialInvoiceMutationKey()
  return mutationOptions<CreateStageMaterialInvoiceStatus201, ResponseErrorConfig<CreateStageMaterialInvoiceStatus400 | CreateStageMaterialInvoiceStatus401 | CreateStageMaterialInvoiceStatus403 | CreateStageMaterialInvoiceStatus404 | CreateStageMaterialInvoiceStatus409 | CreateStageMaterialInvoiceStatus413>, CreateStageMaterialInvoiceOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return createStageMaterialInvoice({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Привязывает к существующему этапу успешно загруженный PDF или JPEG назначения material_invoice размером не более 10 МиБ и положительную сумму. Один fileId можно привязать не более одного раза. Лимит десять счетов проверяется атомарно под блокировкой этапа; при двух конкурентных запросах на десятое место ровно один может завершиться успешно, второй получает 409 invoice_limit_exceeded.
 * @summary Добавить счёт материалов к этапу
 * {@link /stages/:stageId/material-invoices}
 */
export function useCreateStageMaterialInvoice<TContext>(options: {
  mutation?: UseMutationOptions<CreateStageMaterialInvoiceStatus201, ResponseErrorConfig<CreateStageMaterialInvoiceStatus400 | CreateStageMaterialInvoiceStatus401 | CreateStageMaterialInvoiceStatus403 | CreateStageMaterialInvoiceStatus404 | CreateStageMaterialInvoiceStatus409 | CreateStageMaterialInvoiceStatus413>, CreateStageMaterialInvoiceOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createStageMaterialInvoiceMutationKey()

  const baseOptions = createStageMaterialInvoiceMutationOptions(config) as UseMutationOptions<CreateStageMaterialInvoiceStatus201, ResponseErrorConfig<CreateStageMaterialInvoiceStatus400 | CreateStageMaterialInvoiceStatus401 | CreateStageMaterialInvoiceStatus403 | CreateStageMaterialInvoiceStatus404 | CreateStageMaterialInvoiceStatus409 | CreateStageMaterialInvoiceStatus413>, CreateStageMaterialInvoiceOptions, TContext>

  return useMutation<CreateStageMaterialInvoiceStatus201, ResponseErrorConfig<CreateStageMaterialInvoiceStatus400 | CreateStageMaterialInvoiceStatus401 | CreateStageMaterialInvoiceStatus403 | CreateStageMaterialInvoiceStatus404 | CreateStageMaterialInvoiceStatus409 | CreateStageMaterialInvoiceStatus413>, CreateStageMaterialInvoiceOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateStageMaterialInvoiceStatus201, ResponseErrorConfig<CreateStageMaterialInvoiceStatus400 | CreateStageMaterialInvoiceStatus401 | CreateStageMaterialInvoiceStatus403 | CreateStageMaterialInvoiceStatus404 | CreateStageMaterialInvoiceStatus409 | CreateStageMaterialInvoiceStatus413>, CreateStageMaterialInvoiceOptions, TContext>
}
