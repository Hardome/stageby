import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import type { FieldPath, UseFormReturn } from 'react-hook-form';

import type { ProjectFormValues } from '@entities/project';
import { errorStatus, useAccessError } from '@shared/lib/hooks';

import { useCreateProject } from '@api/mutations/useCreateProject';
import { getDashboardSummaryQueryKey } from '@api/queries/useGetDashboardSummary';
import { getProjectQueryKey } from '@api/queries/useGetProject';
import { listDashboardProjectsQueryKey } from '@api/queries/useListDashboardProjects';
import { listProjectsQueryKey } from '@api/queries/useListProjects';
import type { ApiError, CreateProjectOptions } from '@api/types';

import { projectRequest } from './project-form';

function projectErrorMessage(error: unknown): string {
  switch (errorStatus(error)) {
    case 400: {
      return 'Проверьте отмеченные поля.';
    }
    case 401: {
      return 'Сессия завершена. Войдите снова.';
    }
    case 403: {
      return 'Недостаточно прав для создания объекта.';
    }
    case 409: {
      return (
        'Не удалось подтвердить создание объекта из-за конфликта запроса. ' +
        'Повтор не устранит конфликт. Отмените создание и проверьте список объектов перед новой попыткой.'
      );
    }
    default: {
      return 'Не удалось подтвердить создание. Проверьте соединение и нажмите «Повторить».';
    }
  }
}

export function projectErrorPath(path: string, values: ProjectFormValues): string {
  let result = path.replace(/^body\./, '');
  const match = /^stages\.(\d+)(\..*)?$/.exec(result);
  const included = values.stages.flatMap((stage, index) => (stage.enabled ? [index] : []));
  const index = match ? included[Number(match[1])] : undefined;
  if (index !== undefined && match) result = `stages.${index}${match[2] ?? ''}`;
  result = result
    .replace('plannedWorkAmountMinor', 'plannedWorkAmount')
    .replace('plannedMaterialAmountMinor', 'plannedMaterialAmount');

  return result.startsWith('coordinates') ? 'coordinates' : result;
}

function applyFieldErrors(form: UseFormReturn<ProjectFormValues>, details: ApiError['details']): string | undefined {
  let fileError: string | undefined;
  const fieldDetails = details ?? [];
  for (const detail of fieldDetails) {
    const path = projectErrorPath(detail.path, form.getValues());
    if (path.startsWith('documentFileIds')) fileError = detail.message;
    else form.setError(path as FieldPath<ProjectFormValues>, { type: 'server', message: detail.message });
  }

  return fileError;
}

interface UseProjectSubmissionProperties {
  form: UseFormReturn<ProjectFormValues>;
  onSuccess: () => Promise<void>;
  onInvalid: (isFileError: boolean) => void;
}

export function useProjectSubmission({ form, onSuccess, onInvalid }: UseProjectSubmissionProperties) {
  const [snapshot, setSnapshot] = useState<CreateProjectOptions | null>(null);
  const [message, setMessage] = useState('');
  const submitting = useRef(false);
  const accessError = useAccessError();
  const queryClient = useQueryClient();
  const mutation = useCreateProject({
    mutation: {
      retry: false,
      onSuccess: async (project) => {
        queryClient.setQueryData(getProjectQueryKey({ path: { projectId: project.id } }), project);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listProjectsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getDashboardSummaryQueryKey() }),
          queryClient.invalidateQueries({ queryKey: listDashboardProjectsQueryKey() }),
        ]);
        await onSuccess();
      },
      onError: (error) => {
        accessError(error);
        setMessage(projectErrorMessage(error));
        if (errorStatus(error) !== 400) return;
        setSnapshot(null);
        const fileError = applyFieldErrors(form, error.data?.details);
        if (fileError) setMessage(fileError);
        onInvalid(Boolean(fileError));
      },
    },
  });
  const hasConflict = mutation.error?.status === 409;

  async function save(values: ProjectFormValues, fileIds: number[]) {
    if (hasConflict || submitting.current) return;
    const options = snapshot ?? {
      body: projectRequest(values, fileIds),
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    };
    submitting.current = true;
    setSnapshot(options);
    setMessage('');
    try {
      await mutation.mutateAsync(options);
    } catch {
      // Mutation callbacks display server errors and preserve the request for a safe retry.
    } finally {
      submitting.current = false;
    }
  }

  return { save, message, hasSnapshot: snapshot !== null, hasConflict, isPending: mutation.isPending };
}
