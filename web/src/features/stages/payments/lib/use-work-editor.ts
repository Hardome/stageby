import { useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { errorStatus, useAccessError } from '@shared/lib/hooks';

import { getStage } from '@api/clients/getStage';
import { apiErrorSchema } from '@api/zod/apiErrorSchema';

import type { WorkAction, WorkEditorProperties } from '../model/types';
import { executeWorkAction } from './execute-work-action';
import { invalidateWork } from './invalidate-work';
import { reloadWorkAction } from './reload-work-action';
import { useWorkRecipient } from './use-work-recipient';
import { canConfirmPaid } from './work-availability';
import { isWorkActionUnchanged } from './work-changes';
import { type WorkFormValues, workFormDefaults, workFormSchema } from './work-form';

function actionVersion(action: WorkAction, stageVersion: number) {
  if ('row' in action && action.row) return action.row.version;

  return 'payment' in action && action.payment ? action.payment.version : stageVersion;
}

export function useWorkEditor({ stage, action, onClose }: WorkEditorProperties) {
  const [snapshot, setSnapshot] = useState(action);
  const [version, setVersion] = useState(actionVersion(action, stage.version));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const busy = useRef(false);
  const client = useQueryClient();
  const accessError = useAccessError();
  const form = useForm({ defaultValues: workFormDefaults(action), resolver: zodResolver(workFormSchema(snapshot)) });
  useWorkRecipient(action, form);

  function report(error: unknown) {
    accessError(error);
    const data = apiErrorSchema.safeParse(error && typeof error === 'object' && 'data' in error ? error.data : null);
    const isConflict = data.success && data.data.code === 'version_conflict';
    if (isConflict) setNeedsReload(true);
    const status = errorStatus(error);
    setUnavailable(
      status === 401 || status === 403 || status === 404 || (data.success && data.data.code === 'project_archived'),
    );
    const fallback = data.success
      ? data.data.message
      : 'Не удалось выполнить действие. Ввод сохранён. Повторите попытку.';
    setMessage(isConflict ? 'Данные изменились. Обновите их перед сохранением. Ввод сохранён.' : fallback);
  }

  async function submit(values: WorkFormValues) {
    if (needsReload || unavailable || busy.current) return;
    if (isWorkActionUnchanged(snapshot, values)) {
      onClose();

      return;
    }

    busy.current = true;
    setPending(true);
    setMessage('');

    try {
      await executeWorkAction(stage.id, snapshot, values, version);
      await invalidateWork(client, stage, 'row' in snapshot ? snapshot.row?.id : undefined);
      onClose();
    } catch (error) {
      report(error);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function reload() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);

    try {
      const currentStage = await getStage({ path: { stageId: stage.id } }).unwrap();
      if (currentStage.projectIsArchived || !currentStage.isIncluded) {
        setUnavailable(true);
        setMessage('Изменения этапа недоступны.');

        return;
      }
      if (snapshot.kind === 'paid' && !canConfirmPaid(currentStage)) {
        setUnavailable(true);
        setMessage('Подтверждение выплаты больше недоступно. Проверьте статус и остаток этапа.');

        return;
      }
      const updated = await reloadWorkAction(stage.id, snapshot);
      setSnapshot(updated);
      setVersion(actionVersion(updated, currentStage.version));
      setNeedsReload(false);
      await invalidateWork(client, currentStage);
      setMessage('Данные обновлены. Проверьте введённые значения и подтвердите действие.');
    } catch (error) {
      report(error);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return { form, submit, reload, pending, message, needsReload, unavailable, snapshot };
}
