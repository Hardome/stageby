// @ts-nocheck

import type { UseMutationOptions, UseMutationResult, QueryClient } from '@tanstack/react-query'
import type { RequestConfig, ResponseErrorConfig } from '../../.kubb/client'
import type { ConfigureStageChecklistOptions, ConfigureStageChecklistStatus200, ConfigureStageChecklistStatus400, ConfigureStageChecklistStatus401, ConfigureStageChecklistStatus403, ConfigureStageChecklistStatus404, ConfigureStageChecklistStatus409 } from '../../types/ConfigureStageChecklist'
import { mutationOptions, useMutation } from '@tanstack/react-query'
import { configureStageChecklist } from '../../clients/configureStageChecklist'

export const configureStageChecklistMutationKey = () => [{ url: '/stages/:stageId/checklist' }] as const

export function configureStageChecklistMutationOptions<TContext = unknown>(config: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>> = {}) {
  const mutationKey = configureStageChecklistMutationKey()
  return mutationOptions<ConfigureStageChecklistStatus200, ResponseErrorConfig<ConfigureStageChecklistStatus400 | ConfigureStageChecklistStatus401 | ConfigureStageChecklistStatus403 | ConfigureStageChecklistStatus404 | ConfigureStageChecklistStatus409>, ConfigureStageChecklistOptions, TContext>({
    mutationKey,
    mutationFn: async({ path, body }) => {
      return configureStageChecklist({ ...config, path, body, throwOnError: true }).unwrap()
    },
  })
}

/**
 * @description Руководитель или инженер. Только до старта: created, assigned или supplied. Атомарно заменяет весь состав на 3–4 пункта. Создаёт новые ID пунктов, все отметки false, position начинается с 1; увеличивает версии чек-листа и этапа. expectedVersion относится к чек-листу. После старта состав фиксирован. Архив — 409 project_archived. Названия не должны состоять из пробелов.
 * @summary Настроить контрольные точки
 * {@link /stages/:stageId/checklist}
 */
export function useConfigureStageChecklist<TContext>(options: {
  mutation?: UseMutationOptions<ConfigureStageChecklistStatus200, ResponseErrorConfig<ConfigureStageChecklistStatus400 | ConfigureStageChecklistStatus401 | ConfigureStageChecklistStatus403 | ConfigureStageChecklistStatus404 | ConfigureStageChecklistStatus409>, ConfigureStageChecklistOptions, TContext> & { client?: QueryClient },
  client?: Partial<Omit<RequestConfig, 'path' | 'query' | 'body' | 'headers' | 'url'>>,
} = {}) {
  const { mutation = {}, client: config = {} } = options ?? {}
  const { client: queryClient, ...mutationOptions } = mutation;
  const mutationKey = mutationOptions.mutationKey ?? configureStageChecklistMutationKey()

  const baseOptions = configureStageChecklistMutationOptions(config) as UseMutationOptions<ConfigureStageChecklistStatus200, ResponseErrorConfig<ConfigureStageChecklistStatus400 | ConfigureStageChecklistStatus401 | ConfigureStageChecklistStatus403 | ConfigureStageChecklistStatus404 | ConfigureStageChecklistStatus409>, ConfigureStageChecklistOptions, TContext>

  return useMutation<ConfigureStageChecklistStatus200, ResponseErrorConfig<ConfigureStageChecklistStatus400 | ConfigureStageChecklistStatus401 | ConfigureStageChecklistStatus403 | ConfigureStageChecklistStatus404 | ConfigureStageChecklistStatus409>, ConfigureStageChecklistOptions, TContext>({
    ...baseOptions,
    mutationKey,
    ...mutationOptions,
  }, queryClient) as UseMutationResult<ConfigureStageChecklistStatus200, ResponseErrorConfig<ConfigureStageChecklistStatus400 | ConfigureStageChecklistStatus401 | ConfigureStageChecklistStatus403 | ConfigureStageChecklistStatus404 | ConfigureStageChecklistStatus409>, ConfigureStageChecklistOptions, TContext>
}
