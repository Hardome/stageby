import { useEffect } from 'react';

import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

import { useAuth } from '@shared/context';

import { readSessionDraft, removeSessionDraft, writeSessionDraft } from '../storage/session-drafts';

export function useSessionFormDraft<T extends FieldValues, Output extends FieldValues = T>(
  form: UseFormReturn<T, unknown, Output>,
  name: string,
  schema: z.ZodType<T>,
) {
  const { user } = useAuth();
  const userId = user?.id;
  const key = `${name}:${userId ?? 0}`;
  const { reset, subscribe } = form;

  useEffect(() => {
    if (!userId) return;

    const draft = schema.safeParse(readSessionDraft(key));
    if (draft.success) reset(draft.data, { keepDefaultValues: true });

    return subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        const parsed = schema.safeParse(values);
        if (parsed.success) writeSessionDraft(key, parsed.data);
      },
    });
  }, [key, userId, reset, subscribe, schema]);

  return () => removeSessionDraft(key);
}
