// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { UpdateProjectOptions, UpdateProjectStatus200, UpdateProjectStatus400, UpdateProjectStatus401, UpdateProjectStatus403, UpdateProjectStatus404, UpdateProjectStatus409 } from '../../types/UpdateProject'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { updateProject } from '../../clients/updateProject'

export const updateProjectMutationKey = () => [{ url: '/projects/:projectId' }] as const

export function updateProjectMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = updateProjectMutationKey()
  return mutationOptions<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404 | UpdateProjectStatus409>, UpdateProjectOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return updateProject({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Только руководитель. Атомарно сохраняет реквизиты, документы, этапы, чек-листы и дополнительный этап. Проверяет версии и итоговое состояние формы. Пропущенные поля и этапы сохраняются; null очищает nullable-поле. Исключение явно задаётся isIncluded=false, разрешено до фактического старта и без фото (включая удалённые), счетов и выплат. Восстановление сохраняет ID и историю. Минимум один включённый этап обязателен. Архивный объект допускает только отдельное разархивирование isArchived=false. Общие планы объекта не редактируются.
 * @summary Изменить или архивировать проект
 * {@link /projects/:projectId}
 */
export function useUpdateProject<TContext>(options: {
  mutation?: UseMutationOptions<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404 | UpdateProjectStatus409>, UpdateProjectOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? updateProjectMutationKey()

  const baseOptions = updateProjectMutationOptions(config) as UseMutationOptions<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404 | UpdateProjectStatus409>, UpdateProjectOptions, TContext>

  return useMutation<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404 | UpdateProjectStatus409>, UpdateProjectOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<UpdateProjectStatus200, ResponseErrorConfig<UpdateProjectStatus400 | UpdateProjectStatus401 | UpdateProjectStatus403 | UpdateProjectStatus404 | UpdateProjectStatus409>, UpdateProjectOptions, TContext>
}
