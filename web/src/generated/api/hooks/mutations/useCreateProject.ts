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
 * @description Только руководитель. В одной транзакции создаёт проект, выбранные этапы и индивидуальные чек-листы. Если checklistItems этапа отсутствует, сервер копирует активный шаблон его типа. Ошибка любого этапа откатывает всю операцию. Защита интерфейса от повторной отправки будет реализована на фронтенде. Идентификаторы файлов относятся к предварительно успешно загруженным PDF проекта.
 * @summary Составное создание объекта
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
