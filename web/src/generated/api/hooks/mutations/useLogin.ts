// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { LoginOptions, LoginStatus200, LoginStatus400, LoginStatus401, LoginStatus429 } from '../../types/Login'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { login } from '../../clients/login'

export const loginMutationKey = () => [{ url: '/auth/login' }] as const

export function loginMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = loginMutationKey()
  return mutationOptions<LoginStatus200, ResponseErrorConfig<LoginStatus400 | LoginStatus401 | LoginStatus429>, LoginOptions, TContext>({
    mutationKey,
    mutationFn: async({ body }) => {
      return login({ ...config, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Публичный вход. Токен действует до expiresAt (максимум 12 часов) либо отзыва. Refresh-токенов в первой версии нет; после истечения нужен повторный вход. Обязателен лимит попыток по IP и логину. Ответ не кэшируется (Cache-Control: no-store).
 * @summary Войти по логину и паролю
 * {@link /auth/login}
 */
export function useLogin<TContext>(options: {
  mutation?: UseMutationOptions<LoginStatus200, ResponseErrorConfig<LoginStatus400 | LoginStatus401 | LoginStatus429>, LoginOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? loginMutationKey()

  const baseOptions = loginMutationOptions(config) as UseMutationOptions<LoginStatus200, ResponseErrorConfig<LoginStatus400 | LoginStatus401 | LoginStatus429>, LoginOptions, TContext>

  return useMutation<LoginStatus200, ResponseErrorConfig<LoginStatus400 | LoginStatus401 | LoginStatus429>, LoginOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<LoginStatus200, ResponseErrorConfig<LoginStatus400 | LoginStatus401 | LoginStatus429>, LoginOptions, TContext>
}
