import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import type { FieldPath, UseFormReturn } from 'react-hook-form';

import type { ProjectFormValues } from '@entities/project';
import { useAccessError } from '@shared/lib/hooks';

import { useUpdateProject } from '@api/mutations/useUpdateProject';
import { getDashboardSummaryQueryKey } from '@api/queries/useGetDashboardSummary';
import { getProjectQueryKey } from '@api/queries/useGetProject';
import { getProjectEditQueryKey } from '@api/queries/useGetProjectEdit';
import { getStageQueryKey } from '@api/queries/useGetStage';
import { getStageChecklistQueryKey } from '@api/queries/useGetStageChecklist';
import { listDashboardProjectsQueryKey } from '@api/queries/useListDashboardProjects';
import { listProjectStagesQueryKey } from '@api/queries/useListProjectStages';
import { listProjectsQueryKey } from '@api/queries/useListProjects';
import { listStagesQueryKey } from '@api/queries/useListStages';
import type { ApiError, ProjectEdit, UpdateProject } from '@api/types';

import { editErrorPath, projectEditRequest } from './project-edit-form';

interface ProjectUpdateProperties {
  snapshot: ProjectEdit;
  form: UseFormReturn<ProjectFormValues>;
  onSuccess: (hasChanges?: boolean) => Promise<void>;
  onInvalid: (isFileError: boolean) => void;
}

export function useProjectUpdate({ snapshot, form, onSuccess, onInvalid }: ProjectUpdateProperties) {
  const [message, setMessage] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [stageErrors, setStageErrors] = useState<Record<number, string>>({});
  const submitting = useRef(false);
  const request = useRef<UpdateProject | null>(null);
  const accessError = useAccessError();
  const client = useQueryClient();
  const projectId = snapshot.project.id;
  function applyErrors(details: ApiError['details'], body: UpdateProject) {
    let hasFields = false;
    let isFileError = false;
    const fieldDetails = details ?? [];
    for (const detail of fieldDetails) {
      const path = editErrorPath(detail.path, body, snapshot);
      if (!path) continue;
      if (path.startsWith('documentFileIds')) {
        setMessage(detail.message);
        isFileError = true;
        continue;
      }
      form.setError(path as FieldPath<ProjectFormValues>, { type: 'server', message: detail.message });
      hasFields = true;
      const match = /^stages\.(\d+)/.exec(path);
      if (match) setStageErrors((previous) => ({ ...previous, [Number(match[1])]: detail.message }));
    }
    if (hasFields || isFileError) onInvalid(isFileError);
  }

  const mutation = useUpdateProject({
    mutation: {
      retry: false,
      onSuccess: async (project) => {
        client.setQueryData(getProjectQueryKey({ path: { projectId } }), project);
        const keys = [
          getProjectEditQueryKey({ path: { projectId } }),
          listProjectsQueryKey(),
          listStagesQueryKey(),
          listProjectStagesQueryKey({ path: { projectId } }),
          getDashboardSummaryQueryKey(),
          listDashboardProjectsQueryKey(),
          ...snapshot.stages.map(({ stage }) => getStageChecklistQueryKey({ path: { stageId: stage.id } })),
          ...snapshot.stages.map(({ stage }) => getStageQueryKey({ path: { stageId: stage.id } })),
        ];
        await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
        await onSuccess();
      },
      onError: (error) => {
        accessError(error);
        const messages: Record<number, string> = {
          400: 'Проверьте отмеченные поля.',
          401: 'Сессия завершена. Войдите снова.',
          403: 'Недостаточно прав для редактирования объекта.',
          404: 'Объект не найден.',
          409: error.data?.message ?? 'Состояние объекта изменилось.',
        };
        setMessage(
          messages[error.status] ?? 'Не удалось сохранить изменения. Проверьте соединение и повторите попытку.',
        );
        setNeedsReload(error.data?.code === 'version_conflict');
        setUnavailable(
          error.status === 401 ||
            error.status === 403 ||
            error.status === 404 ||
            error.data?.code === 'project_archived',
        );
        if (request.current) applyErrors(error.data?.details, request.current);
      },
    },
  });

  async function save(values: ProjectFormValues, fileIds: number[]) {
    if (needsReload || unavailable || submitting.current) return;
    submitting.current = true;
    setMessage('');
    setStageErrors({});
    try {
      const body = projectEditRequest(snapshot, values, fileIds);
      if (Object.keys(body).length === 1) {
        await onSuccess(false);

        return;
      }
      request.current = body;
      await mutation.mutateAsync({ path: { projectId }, body });
    } catch {
      // Ошибки запроса отображаются в обработчике мутации; введённые данные сохраняются.
    } finally {
      submitting.current = false;
    }
  }

  return { save, message, needsReload, unavailable, stageErrors, isPending: mutation.isPending };
}
