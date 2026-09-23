// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateTodoOptions, CreateTodoStatus201, CreateTodoStatus400 } from '../../types/CreateTodo'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createTodo } from '../../clients/createTodo'

export const createTodoMutationKey = () => [{ url: '/todos' }] as const

export function createTodoMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createTodoMutationKey()
  return mutationOptions<CreateTodoStatus201, ResponseErrorConfig<CreateTodoStatus400>, CreateTodoOptions, TContext>({
    mutationKey,
    mutationFn: async({ body }) => {
      return createTodo({ ...config, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @summary Create a todo
 * {@link /todos}
 */
export function useCreateTodo<TContext>(options: {
  mutation?: UseMutationOptions<CreateTodoStatus201, ResponseErrorConfig<CreateTodoStatus400>, CreateTodoOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createTodoMutationKey()

  const baseOptions = createTodoMutationOptions(config) as UseMutationOptions<CreateTodoStatus201, ResponseErrorConfig<CreateTodoStatus400>, CreateTodoOptions, TContext>

  return useMutation<CreateTodoStatus201, ResponseErrorConfig<CreateTodoStatus400>, CreateTodoOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateTodoStatus201, ResponseErrorConfig<CreateTodoStatus400>, CreateTodoOptions, TContext>
}
