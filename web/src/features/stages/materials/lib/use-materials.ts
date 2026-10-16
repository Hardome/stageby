import { useEffect } from 'react';

import { useAccessError } from '@shared/lib/hooks';

import { useListStageMaterialInvoices } from '@api/queries/useListStageMaterialInvoices';

export function useMaterials(stageId: number) {
  const query = useListStageMaterialInvoices({ path: { stageId } }, { query: { retry: false } });
  const accessError = useAccessError();
  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);
  return query;
}
