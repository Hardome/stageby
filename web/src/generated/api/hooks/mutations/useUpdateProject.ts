// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateProjectOptions, UpdateProjectStatus200, UpdateProjectStatus400, UpdateProjectStatus401, UpdateProjectStatus403, UpdateProjectStatus404 } from '../../types/UpdateProject'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateProject } from '../../clients/updateProject'

export const updateProjectMutationKey = () => [{ url: '/projects/:projectId' }] as const

export function updateProjectMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateProjectMutationKey()
  return mutationOptions<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404>, UpdateProjectOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateProject({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Архивирование не удаляет историю, делает этапы и чек-листы проекта доступными только для чтения. Разархивирование — isArchived=false. Физического удаления проекта и фиксированных этапов нет.
 * @summary Изменить или архивировать проект
 * {@link /projects/:projectId}
 */
export function useUpdateProject<TContext>(options: {
  mutation?: UseMutationOptions<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404>, UpdateProjectOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateProjectMutationKey()

  const baseOptions = updateProjectMutationOptions(config) as UseMutationOptions<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404>, UpdateProjectOptions, TContext>

  return useMutation<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404>, UpdateProjectOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404>, UpdateProjectOptions, TContext>
}
