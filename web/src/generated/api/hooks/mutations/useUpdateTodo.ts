// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateTodoOptions, UpdateTodoStatus200, UpdateTodoStatus400, UpdateTodoStatus404 } from '../../types/UpdateTodo'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateTodo } from '../../clients/updateTodo'

export const updateTodoMutationKey = () => [{ url: '/todos/:id' }] as const

export function updateTodoMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateTodoMutationKey()
  return mutationOptions<UpdateTodoStatus200, ResponseErrorConfig<UpdateTodoStatus400 | UpdateTodoStatus404>, UpdateTodoOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateTodo({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @summary Update a todo
 * {@link /todos/:id}
 */
export function useUpdateTodo<TContext>(options: {
  mutation?: UseMutationOptions<UpdateTodoStatus200, ResponseErrorConfig<UpdateTodoStatus400 | UpdateTodoStatus404>, UpdateTodoOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateTodoMutationKey()

  const baseOptions = updateTodoMutationOptions(config) as UseMutationOptions<UpdateTodoStatus200, ResponseErrorConfig<UpdateTodoStatus400 | UpdateTodoStatus404>, UpdateTodoOptions, TContext>

  return useMutation<UpdateTodoStatus200, ResponseErrorConfig<UpdateTodoStatus400 | UpdateTodoStatus404>, UpdateTodoOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateTodoStatus200, ResponseErrorConfig<UpdateTodoStatus400 | UpdateTodoStatus404>, UpdateTodoOptions, TContext>
}
