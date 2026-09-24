// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { SetUserPasswordOptions, SetUserPasswordStatus204, SetUserPasswordStatus400, SetUserPasswordStatus401, SetUserPasswordStatus403, SetUserPasswordStatus404 } from '../../types/SetUserPassword'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { setUserPassword } from '../../clients/setUserPassword'

export const setUserPasswordMutationKey = () => [{ url: '/users/:userId/password' }] as const

export function setUserPasswordMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = setUserPasswordMutationKey()
  return mutationOptions<SetUserPasswordStatus204, ResponseErrorConfig<SetUserPasswordStatus400 | SetUserPasswordStatus401 | SetUserPasswordStatus403 | SetUserPasswordStatus404>, SetUserPasswordOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return setUserPassword({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Заменяет пароль и отзывает все сессии целевого пользователя, включая текущую, если он меняет собственный пароль. Следующий запрос требует повторного входа.
 * @summary Установить пароль пользователя
 * {@link /users/:userId/password}
 */
export function useSetUserPassword<TContext>(options: {
  mutation?: UseMutationOptions<SetUserPasswordStatus204, ResponseErrorConfig<SetUserPasswordStatus400 | SetUserPasswordStatus401 | SetUserPasswordStatus403 | SetUserPasswordStatus404>, SetUserPasswordOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? setUserPasswordMutationKey()

  const baseOptions = setUserPasswordMutationOptions(config) as UseMutationOptions<SetUserPasswordStatus204, ResponseErrorConfig<SetUserPasswordStatus400 | SetUserPasswordStatus401 | SetUserPasswordStatus403 | SetUserPasswordStatus404>, SetUserPasswordOptions, TContext>

  return useMutation<SetUserPasswordStatus204, ResponseErrorConfig<SetUserPasswordStatus400 | SetUserPasswordStatus401 | SetUserPasswordStatus403 | SetUserPasswordStatus404>, SetUserPasswordOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<SetUserPasswordStatus204, ResponseErrorConfig<SetUserPasswordStatus400 | SetUserPasswordStatus401 | SetUserPasswordStatus403 | SetUserPasswordStatus404>, SetUserPasswordOptions, TContext>
}
