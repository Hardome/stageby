import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useAccessError } from '@shared/lib/hooks';

import { acceptStage } from '@api/clients/acceptStage';
import { returnStageForRework } from '@api/clients/returnStageForRework';
import { useGetStageChecklist } from '@api/queries/useGetStageChecklist';
import type { Stage } from '@api/types';

import type { ReworkFormValues } from '../model/types';
import { defaultCorrectionDate, reworkFormSchema } from './rework-form';
import { useAcceptanceAction } from './use-acceptance-action';

export function useAcceptanceForm(stage: Stage) {
  const [reworkOpen, setReworkOpen] = useState(false);
  const action = useAcceptanceAction(stage);
  const checklist = useGetStageChecklist({ path: { stageId: stage.id } }, { query: { retry: false } });
  const accessError = useAccessError();
  const schema = reworkFormSchema(checklist.data?.items.map((item) => item.id) ?? []);
  const form = useForm<ReworkFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [], correctionDueDate: defaultCorrectionDate() },
  });
  const isBlocked = action.blocked || checklist.isFetching || Boolean(checklist.error) || !checklist.data;

  useEffect(() => {
    if (checklist.error) accessError(checklist.error);
  }, [checklist.error, accessError]);

  function accept() {
    if (isBlocked) return;

    void action.run(() =>
      acceptStage({ path: { stageId: stage.id }, body: { expectedVersion: stage.version } }).unwrap(),
    );
  }

  const submit = form.handleSubmit(async (values) => {
    if (isBlocked) return;

    await action.run(() =>
      returnStageForRework({
        path: { stageId: stage.id },
        body: { ...values, expectedVersion: stage.version },
      }).unwrap(),
    );
  });

  return { form, action, checklist, blocked: isBlocked, reworkOpen, setReworkOpen, accept, submit };
}
