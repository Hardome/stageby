// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { DeleteTodoOptions, DeleteTodoStatus204, DeleteTodoStatus404 } from '../../types/DeleteTodo'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { deleteTodo } from '../../clients/deleteTodo'

export const deleteTodoMutationKey = () => [{ url: '/todos/:id' }] as const

export function deleteTodoMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = deleteTodoMutationKey()
  return mutationOptions<DeleteTodoStatus204, ResponseErrorConfig<DeleteTodoStatus404>, DeleteTodoOptions, TContext>({
    mutationKey,
    mutationFn: async({ path }) => {
      return deleteTodo({ ...config, path, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @summary Delete a todo
 * {@link /todos/:id}
 */
export function useDeleteTodo<TContext>(options: {
  mutation?: UseMutationOptions<DeleteTodoStatus204, ResponseErrorConfig<DeleteTodoStatus404>, DeleteTodoOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? deleteTodoMutationKey()

  const baseOptions = deleteTodoMutationOptions(config) as UseMutationOptions<DeleteTodoStatus204, ResponseErrorConfig<DeleteTodoStatus404>, DeleteTodoOptions, TContext>

  return useMutation<DeleteTodoStatus204, ResponseErrorConfig<DeleteTodoStatus404>, DeleteTodoOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<DeleteTodoStatus204, ResponseErrorConfig<DeleteTodoStatus404>, DeleteTodoOptions, TContext>
}
