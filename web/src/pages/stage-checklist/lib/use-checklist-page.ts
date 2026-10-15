import { useEffect } from 'react';

import { useStageAccess } from '@entities/stage';
import { parseEntityId } from '@shared/lib';
import { useAccessError } from '@shared/lib/hooks';

import { useGetStageChecklist } from '@api/queries/useGetStageChecklist';

export function useChecklistPage(stageId: string, itemId?: string) {
  const { query, invalidId } = useStageAccess(stageId);
  const parsedItemId = itemId === undefined ? undefined : parseEntityId(itemId);
  const checklist = useGetStageChecklist(
    { path: { stageId: query.data?.id ?? 0 } },
    {
      query: { enabled: Boolean(query.data) && parsedItemId !== undefined, retry: false },
    },
  );
  const accessError = useAccessError();
  useEffect(() => {
    if (checklist.error) accessError(checklist.error);
  }, [checklist.error, accessError]);
  const item = checklist.data?.items.find((entry) => entry.id === parsedItemId);
  const isUnavailable = [query.error?.status, checklist.error?.status].some(
    (status) => status === 403 || status === 404,
  );
  const isInvalidItem = itemId !== undefined && (parsedItemId === undefined || Boolean(!item && checklist.data));

  function reload() {
    void query.refetch();
    if (parsedItemId !== undefined && query.data) void checklist.refetch();
  }

  return { query, checklist, item, reload, notFound: invalidId || isUnavailable || isInvalidItem };
}
