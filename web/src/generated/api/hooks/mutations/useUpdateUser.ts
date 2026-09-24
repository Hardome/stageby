// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateUserOptions, UpdateUserStatus200, UpdateUserStatus400, UpdateUserStatus401, UpdateUserStatus403, UpdateUserStatus404, UpdateUserStatus409 } from '../../types/UpdateUser'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateUser } from '../../clients/updateUser'

export const updateUserMutationKey = () => [{ url: '/users/:userId' }] as const

export function updateUserMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateUserMutationKey()
  return mutationOptions<UpdateUserStatus200, ResponseErrorConfig<UpdateUserStatus400 | UpdateUserStatus401 | UpdateUserStatus403 | UpdateUserStatus404 | UpdateUserStatus409>, UpdateUserOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateUser({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Деактивация и изменение роли отзывают все сессии пользователя. Нельзя лишить систему последнего активного manager (409 last_manager). Нельзя деактивировать или сменить роль назначенного мастера/приёмщика незавершённого этапа: сначала переназначьте этап (409 user_in_use). Удаления нет; история сохраняется.
 * @summary Изменить пользователя
 * {@link /users/:userId}
 */
export function useUpdateUser<TContext>(options: {
  mutation?: UseMutationOptions<UpdateUserStatus200, ResponseErrorConfig<UpdateUserStatus400 | UpdateUserStatus401 | UpdateUserStatus403 | UpdateUserStatus404 | UpdateUserStatus409>, UpdateUserOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateUserMutationKey()

  const baseOptions = updateUserMutationOptions(config) as UseMutationOptions<UpdateUserStatus200, ResponseErrorConfig<UpdateUserStatus400 | UpdateUserStatus401 | UpdateUserStatus403 | UpdateUserStatus404 | UpdateUserStatus409>, UpdateUserOptions, TContext>

  return useMutation<UpdateUserStatus200, ResponseErrorConfig<UpdateUserStatus400 | UpdateUserStatus401 | UpdateUserStatus403 | UpdateUserStatus404 | UpdateUserStatus409>, UpdateUserOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateUserStatus200, ResponseErrorConfig<UpdateUserStatus400 | UpdateUserStatus401 | UpdateUserStatus403 | UpdateUserStatus404 | UpdateUserStatus409>, UpdateUserOptions, TContext>
}
