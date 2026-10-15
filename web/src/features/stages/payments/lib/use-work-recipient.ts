import { useEffect } from 'react';

import type { UseFormReturn } from 'react-hook-form';

import { useAccessError } from '@shared/lib/hooks';

import { useGetUser } from '@api/queries/useGetUser';

import type { WorkAction } from '../model/types';
import type { WorkFormValues } from './work-form';

export function useWorkRecipient(action: WorkAction, form: UseFormReturn<WorkFormValues>) {
  const recipientId = action.kind === 'row' ? action.row?.recipientId : null;
  const query = useGetUser(
    { path: { userId: recipientId ?? 0 } },
    {
      query: { enabled: Boolean(recipientId), retry: false },
    },
  );
  const accessError = useAccessError();

  useEffect(() => {
    if (query.error) accessError(query.error);
    if (query.data && form.getValues('recipient')?.id === query.data.id) {
      form.setValue('recipient', { id: query.data.id, label: query.data.fullName });
    }
  }, [query.data, query.error, form, accessError]);
}
