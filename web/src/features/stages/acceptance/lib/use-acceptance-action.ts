import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { invalidateStage } from '@entities/stage';
import { errorStatus, useAccessError } from '@shared/lib/hooks';

import { getStage } from '@api/clients/getStage';
import { getStageChecklist } from '@api/clients/getStageChecklist';
import { getStageQueryKey } from '@api/queries/useGetStage';
import { getStageChecklistQueryKey } from '@api/queries/useGetStageChecklist';
import type { Stage } from '@api/types';
import { apiErrorSchema } from '@api/zod/apiErrorSchema';

export function useAcceptanceAction(stage: Stage) {
  const client = useQueryClient();
  const accessError = useAccessError();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [saved, setSaved] = useState(false);
  const path = { stageId: stage.id };

  function report(error: unknown) {
    accessError(error);
    const parsed = apiErrorSchema.safeParse(error && typeof error === 'object' && 'data' in error ? error.data : null);
    const status = errorStatus(error);
    const isConflict = status === 409;
    const fallback = parsed.success
      ? parsed.data.message
      : 'Не удалось сохранить решение. Ввод сохранён. Повторите попытку.';
    setNeedsReload(isConflict);
    setUnavailable(new Set([401, 403, 404]).has(status ?? 0));
    setMessage(isConflict ? 'Данные изменились. Обновите их и проверьте ввод перед повтором.' : fallback);
  }

  async function run(execute: () => Promise<Stage>) {
    if (needsReload || unavailable || saved || lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage('');

    try {
      const current = await execute();
      client.setQueryData(getStageQueryKey({ path }), current);
      setSaved(true);
      setMessage('Решение сохранено.');
      await invalidateStage(client, current);
    } catch (error) {
      report(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  async function reload() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);

    try {
      const [current, checklist] = await Promise.all([
        getStage({ path }).unwrap(),
        getStageChecklist({ path }).unwrap(),
      ]);
      client.setQueryData(getStageQueryKey({ path }), current);
      client.setQueryData(getStageChecklistQueryKey({ path }), checklist);
      setNeedsReload(false);
      setUnavailable(current.projectIsArchived || !current.isIncluded || current.status !== 'acceptance');
      setMessage('Данные обновлены. Проверьте ввод и подтвердите решение.');
    } catch (error) {
      report(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return { run, reload, pending, message, needsReload, blocked: pending || needsReload || unavailable || saved };
}
