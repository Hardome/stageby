// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { CreateProjectOptions, CreateProjectStatus201, CreateProjectStatus400, CreateProjectStatus401, CreateProjectStatus403 } from '../../types/CreateProject'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { createProject } from '../../clients/createProject'

export const createProjectMutationKey = () => [{ url: '/projects' }] as const

export function createProjectMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = createProjectMutationKey()
  return mutationOptions<CreateProjectStatus201, ResponseErrorConfig<CreateProjectStatus400 | CreateProjectStatus401 | CreateProjectStatus403>, CreateProjectOptions, TContext>({
    mutationKey,
    mutationFn: async({ body }) => {
      return createProject({ ...config, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Атомарно создаёт проект, по одному этапу каждого фиксированного типа и пустой чек-лист каждого этапа. Статусы created, назначения и даты этапов null, зависимости пустые, все четыре суммы null. Получить этапы: GET /projects/{projectId}/stages. Необязательные поля проекта по умолчанию null; isArchived=false.
 * @summary Создать проект с восемью этапами
 * {@link /projects}
 */
export function useCreateProject<TContext>(options: {
  mutation?: UseMutationOptions<CreateProjectStatus201, ResponseErrorConfig<CreateProjectStatus400 | CreateProjectStatus401 | CreateProjectStatus403>, CreateProjectOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? createProjectMutationKey()

  const baseOptions = createProjectMutationOptions(config) as UseMutationOptions<CreateProjectStatus201, ResponseErrorConfig<CreateProjectStatus400 | CreateProjectStatus401 | CreateProjectStatus403>, CreateProjectOptions, TContext>

  return useMutation<CreateProjectStatus201, ResponseErrorConfig<CreateProjectStatus400 | CreateProjectStatus401 | CreateProjectStatus403>, CreateProjectOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<CreateProjectStatus201, ResponseErrorConfig<CreateProjectStatus400 | CreateProjectStatus401 | CreateProjectStatus403>, CreateProjectOptions, TContext>
}
