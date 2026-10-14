import { type SubmitEvent, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { invalidateStage } from '@entities/stage';
import { useAccessError } from '@shared/lib/hooks';

import { getStage } from '@api/clients/getStage';
import { useUpdateStage } from '@api/mutations/useUpdateStage';
import { getStageQueryKey } from '@api/queries/useGetStage';
import type { Stage } from '@api/types';

import type { StageFormValues } from './stage-form';
import { stageFormSchema, stageFormValues, stageUpdateRequest } from './stage-form';

export function useStageForm(stage: Stage, onSuccess?: () => void) {
  const [snapshot, setSnapshot] = useState(stage);
  const [message, setMessage] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [reloading, setReloading] = useState(false);
  const busy = useRef(false);
  const client = useQueryClient();
  const accessError = useAccessError();
  const form = useForm({ defaultValues: stageFormValues(stage), resolver: zodResolver(stageFormSchema(snapshot)) });
  const path = { stageId: stage.id };

  const mutation = useUpdateStage({
    mutation: {
      retry: false,
      onSuccess: async (updated) => {
        client.setQueryData(getStageQueryKey({ path }), updated);
        setSnapshot(updated);
        form.reset(stageFormValues(updated));
        await invalidateStage(client, updated);
        setMessage('Параметры сохранены.');
        onSuccess?.();
      },
      onError: (error) => {
        accessError(error);
        setNeedsReload(error.data?.code === 'version_conflict');
        setUnavailable(
          error.status === 401 ||
            error.status === 403 ||
            error.status === 404 ||
            error.data?.code === 'project_archived',
        );
        setMessage(
          error.data?.code === 'version_conflict'
            ? 'Этап изменился. Обновите данные перед повторным сохранением. Ввод сохранён.'
            : (error.data?.message ?? 'Не удалось сохранить параметры. Повторите попытку.'),
        );
        const details = error.data?.details ?? [];
        for (const detail of details) {
          if (Object.hasOwn(form.getValues(), detail.path)) {
            form.setError(detail.path as keyof ReturnType<typeof stageFormValues>, { message: detail.message });
          }
        }
      },
    },
  });

  async function submit(values: StageFormValues) {
    if (needsReload || unavailable || busy.current) return;
    busy.current = true;
    setMessage('');
    try {
      const body = stageUpdateRequest(snapshot, values);
      if (Object.keys(body).length === 1) {
        setMessage('Нет изменений.');
        onSuccess?.();
        return;
      }
      await mutation.mutateAsync({ path, body });
    } catch {
      // Ошибка мутации сохраняет введённые значения.
    } finally {
      busy.current = false;
    }
  }

  function save(event: SubmitEvent<HTMLFormElement>) {
    void form.handleSubmit(submit)(event);
  }

  async function reload() {
    if (busy.current) return;
    busy.current = true;
    setReloading(true);
    try {
      const updated = await getStage({ path, throwOnError: true }).unwrap();
      const values = form.getValues();
      const defaults = stageFormValues(snapshot);
      client.setQueryData(getStageQueryKey({ path }), updated);
      setSnapshot(updated);
      form.reset(stageFormValues(updated));
      for (const key of Object.keys(values) as (keyof typeof values)[]) {
        const hasChanged =
          key === 'assignee' ? values.assignee?.id !== defaults.assignee?.id : values[key] !== defaults[key];
        if (hasChanged) form.setValue(key, values[key], { shouldDirty: true });
      }
      setNeedsReload(false);
      setMessage('Данные обновлены. Проверьте введённые параметры и сохраните.');
    } catch (error) {
      accessError(error);
      setMessage('Не удалось обновить этап. Повторите попытку.');
    } finally {
      busy.current = false;
      setReloading(false);
    }
  }

  return { form, save, reload, message, needsReload, unavailable, snapshot, pending: mutation.isPending || reloading };
}
