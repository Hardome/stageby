// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateUserOptions, CreateUserStatus201, CreateUserStatus400, CreateUserStatus401, CreateUserStatus403, CreateUserStatus409 } from '../../types/CreateUser'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createUser } from '../../clients/createUser'

export const createUserMutationKey = () => [{ url: '/users' }] as const

export function createUserMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createUserMutationKey()
  return mutationOptions<CreateUserStatus201, ResponseErrorConfig<CreateUserStatus400 | CreateUserStatus401 | CreateUserStatus403 | CreateUserStatus409>, CreateUserOptions, TContext>({
    mutationKey,
    mutationFn: async({ body }) => {
      return createUser({ ...config, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Новая запись активна. Логин уникален среди всех записей, включая неактивные; дубликат — 409 login_taken. Самостоятельной регистрации нет.
 * @summary Создать учётную запись
 * {@link /users}
 */
export function useCreateUser<TContext>(options: {
  mutation?: UseMutationOptions<CreateUserStatus201, ResponseErrorConfig<CreateUserStatus400 | CreateUserStatus401 | CreateUserStatus403 | CreateUserStatus409>, CreateUserOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createUserMutationKey()

  const baseOptions = createUserMutationOptions(config) as UseMutationOptions<CreateUserStatus201, ResponseErrorConfig<CreateUserStatus400 | CreateUserStatus401 | CreateUserStatus403 | CreateUserStatus409>, CreateUserOptions, TContext>

  return useMutation<CreateUserStatus201, ResponseErrorConfig<CreateUserStatus400 | CreateUserStatus401 | CreateUserStatus403 | CreateUserStatus409>, CreateUserOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateUserStatus201, ResponseErrorConfig<CreateUserStatus400 | CreateUserStatus401 | CreateUserStatus403 | CreateUserStatus409>, CreateUserOptions, TContext>
}
