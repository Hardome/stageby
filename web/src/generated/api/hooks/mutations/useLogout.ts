// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { LogoutStatus204, LogoutStatus401 } from '../../types/Logout'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { logout } from '../../clients/logout'

export const logoutMutationKey = () => [{ url: '/auth/logout' }] as const

export function logoutMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = logoutMutationKey()
  return mutationOptions<LogoutStatus204, ResponseErrorConfig<LogoutStatus401>, undefined, TContext>({
    mutationKey,
    mutationFn: async(_) => {
      return logout({ ...config, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Отзывает предъявленный токен. При последующих запросах с ним возвращается 401.
 * @summary Завершить текущую сессию
 * {@link /auth/logout}
 */
export function useLogout<TContext>(options: {
  mutation?: UseMutationOptions<LogoutStatus204, ResponseErrorConfig<LogoutStatus401>, undefined, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? logoutMutationKey()

  const baseOptions = logoutMutationOptions(config) as UseMutationOptions<LogoutStatus204, ResponseErrorConfig<LogoutStatus401>, undefined, TContext>

  return useMutation<LogoutStatus204, ResponseErrorConfig<LogoutStatus401>, undefined, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<LogoutStatus204, ResponseErrorConfig<LogoutStatus401>, undefined, TContext>
}
