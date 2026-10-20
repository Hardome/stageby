import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateStage } from '@entities/stage';
import { errorStatus, useAccessError } from '@shared/lib/hooks';

import { getStage } from '@api/clients/getStage';
import { listStageMaterialInvoices } from '@api/clients/listStageMaterialInvoices';
import { getStageQueryKey } from '@api/queries/useGetStage';
import { listStageMaterialInvoicesQueryKey } from '@api/queries/useListStageMaterialInvoices';
import type { Stage } from '@api/types';
import { apiErrorSchema } from '@api/zod/apiErrorSchema';

export function useMaterialAction(stage: Stage, invoiceId?: number) {
  const client = useQueryClient();
  const accessError = useAccessError();
  const busy = useRef(false);
  const [reloading, setReloading] = useState(false);
  const [message, setMessage] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const mutation = useMutation({
    mutationFn: async ({ execute, onSuccess }: { execute: () => Promise<unknown>; onSuccess?: () => void }) => {
      await execute();
      await invalidateStage(client, stage);
      onSuccess?.();
    },
    retry: false,
  });

  function report(error: unknown) {
    accessError(error);
    const parsed = apiErrorSchema.safeParse(error && typeof error === 'object' && 'data' in error ? error.data : null);
    const code = parsed.success ? parsed.data.code : undefined;
    setNeedsReload(code === 'version_conflict');
    const status = errorStatus(error);
    setUnavailable(status === 401 || status === 403 || status === 404 || code === 'project_archived');
    const fallback = parsed.success ? parsed.data.message : 'Не удалось сохранить. Ввод сохранён. Повторите попытку.';
    setMessage(
      code === 'version_conflict' ? 'Данные изменились. Обновите их и проверьте ввод перед повтором.' : fallback,
    );

    return code;
  }

  async function run(action: () => Promise<unknown>, onSuccess?: () => void, onFailure?: (error: unknown) => void) {
    if (needsReload || unavailable || busy.current) return;
    busy.current = true;
    setMessage('');
    try {
      await mutation.mutateAsync({ execute: action, onSuccess });
    } catch (error) {
      onFailure?.(error);
      if (report(error) === 'invoice_limit_exceeded') await invalidateStage(client, stage);
    } finally {
      busy.current = false;
    }
  }

  async function reload() {
    if (busy.current) return;
    busy.current = true;
    setReloading(true);
    try {
      const path = { stageId: stage.id };
      const [current, invoices] = await Promise.all([
        getStage({ path }).unwrap(),
        listStageMaterialInvoices({ path }).unwrap(),
      ]);
      client.setQueryData(getStageQueryKey({ path }), current);
      client.setQueryData(listStageMaterialInvoicesQueryKey({ path }), invoices);
      const isMissing = invoiceId !== undefined && invoices.every((invoice) => invoice.id !== invoiceId);
      setUnavailable(current.projectIsArchived || !current.isIncluded || isMissing);
      setNeedsReload(false);
      setMessage(
        isMissing
          ? 'Счёт уже удалён. Действие недоступно.'
          : 'Данные обновлены. Проверьте ввод и подтвердите действие.',
      );
      return invoices;
    } catch (error) {
      accessError(error);
      setMessage('Не удалось обновить данные. Повторите попытку.');
    } finally {
      busy.current = false;
      setReloading(false);
    }
  }

  const isPending = mutation.isPending || reloading;

  return { run, reload, pending: isPending, message, needsReload, blocked: isPending || needsReload || unavailable };
}
