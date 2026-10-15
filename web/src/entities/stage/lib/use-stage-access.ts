import { useEffect } from 'react';

import { parseEntityId } from '@shared/lib';
import { useAccessError } from '@shared/lib/hooks';

import { useGetStage } from '@api/queries/useGetStage';

export function useStageAccess(stageId: string) {
  const id = parseEntityId(stageId);
  const query = useGetStage({ path: { stageId: id ?? 0 } }, { query: { enabled: id !== undefined, retry: false } });
  const handleAccessError = useAccessError();

  useEffect(() => {
    if (query.error) handleAccessError(query.error);
  }, [query.error, handleAccessError]);

  return { query, invalidId: id === undefined };
}
