// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { RequestPasswordResetOptions, RequestPasswordResetStatus202, RequestPasswordResetStatus400, RequestPasswordResetStatus429 } from '../../types/RequestPasswordReset'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { requestPasswordReset } from '../../clients/requestPasswordReset'

export const requestPasswordResetMutationKey = () => [{ url: '/auth/password-reset-requests' }] as const

export function requestPasswordResetMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = requestPasswordResetMutationKey()
  return mutationOptions<RequestPasswordResetStatus202, ResponseErrorConfig<RequestPasswordResetStatus400 | RequestPasswordResetStatus429>, RequestPasswordResetOptions, TContext>({
    mutationKey,
    mutationFn: async({ body }) => {
      return requestPasswordReset({ ...config, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Публичный запрос по логину. Ответ одинаков для существующего, неизвестного и неактивного пользователя. Руководитель видит отметку в списке пользователей и закрывает запрос назначением нового пароля. Повтор открытого запроса не создаёт дубля. Применяется лимит запросов по IP и логину.
 * @summary Запросить назначение нового пароля
 * {@link /auth/password-reset-requests}
 */
export function useRequestPasswordReset<TContext>(options: {
  mutation?: UseMutationOptions<RequestPasswordResetStatus202, ResponseErrorConfig<RequestPasswordResetStatus400 | RequestPasswordResetStatus429>, RequestPasswordResetOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? requestPasswordResetMutationKey()

  const baseOptions = requestPasswordResetMutationOptions(config) as UseMutationOptions<RequestPasswordResetStatus202, ResponseErrorConfig<RequestPasswordResetStatus400 | RequestPasswordResetStatus429>, RequestPasswordResetOptions, TContext>

  return useMutation<RequestPasswordResetStatus202, ResponseErrorConfig<RequestPasswordResetStatus400 | RequestPasswordResetStatus429>, RequestPasswordResetOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<RequestPasswordResetStatus202, ResponseErrorConfig<RequestPasswordResetStatus400 | RequestPasswordResetStatus429>, RequestPasswordResetOptions, TContext>
}
