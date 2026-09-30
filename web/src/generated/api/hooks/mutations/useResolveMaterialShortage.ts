// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ResolveMaterialShortageOptions, ResolveMaterialShortageStatus200, ResolveMaterialShortageStatus400, ResolveMaterialShortageStatus401, ResolveMaterialShortageStatus403, ResolveMaterialShortageStatus404, ResolveMaterialShortageStatus409 } from '../../types/ResolveMaterialShortage'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { resolveMaterialShortage } from '../../clients/resolveMaterialShortage'

export const resolveMaterialShortageMutationKey = () => [{ url: '/material-shortages/:shortageId/resolution' }] as const

export function resolveMaterialShortageMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = resolveMaterialShortageMutationKey()
  return mutationOptions<ResolveMaterialShortageStatus200, ResponseErrorConfig<ResolveMaterialShortageStatus400 | ResolveMaterialShortageStatus401 | ResolveMaterialShortageStatus403 | ResolveMaterialShortageStatus404 | ResolveMaterialShortageStatus409>, ResolveMaterialShortageOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return resolveMaterialShortage({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Повторное закрытие запрещено.
 * @summary Закрыть нехватку
 * {@link /material-shortages/:shortageId/resolution}
 */
export function useResolveMaterialShortage<TContext>(options: {
  mutation?: UseMutationOptions<ResolveMaterialShortageStatus200, ResponseErrorConfig<ResolveMaterialShortageStatus400 | ResolveMaterialShortageStatus401 | ResolveMaterialShortageStatus403 | ResolveMaterialShortageStatus404 | ResolveMaterialShortageStatus409>, ResolveMaterialShortageOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? resolveMaterialShortageMutationKey()

  const baseOptions = resolveMaterialShortageMutationOptions(config) as UseMutationOptions<ResolveMaterialShortageStatus200, ResponseErrorConfig<ResolveMaterialShortageStatus400 | ResolveMaterialShortageStatus401 | ResolveMaterialShortageStatus403 | ResolveMaterialShortageStatus404 | ResolveMaterialShortageStatus409>, ResolveMaterialShortageOptions, TContext>

  return useMutation<ResolveMaterialShortageStatus200, ResponseErrorConfig<ResolveMaterialShortageStatus400 | ResolveMaterialShortageStatus401 | ResolveMaterialShortageStatus403 | ResolveMaterialShortageStatus404 | ResolveMaterialShortageStatus409>, ResolveMaterialShortageOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<ResolveMaterialShortageStatus200, ResponseErrorConfig<ResolveMaterialShortageStatus400 | ResolveMaterialShortageStatus401 | ResolveMaterialShortageStatus403 | ResolveMaterialShortageStatus404 | ResolveMaterialShortageStatus409>, ResolveMaterialShortageOptions, TContext>
}
