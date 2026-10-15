import { useEffect } from 'react';

import { useAccessError } from '@shared/lib/hooks';

import { useListWorkPayments } from '@api/queries/useListWorkPayments';
import { useListWorkPlanRows } from '@api/queries/useListWorkPlanRows';

export function useWorkPayments(stageId: number) {
  const rows = useListWorkPlanRows({ path: { stageId } }, { query: { retry: false } });
  const payments = useListWorkPayments({ path: { stageId } }, { query: { retry: false } });
  const accessError = useAccessError();
  const error = rows.error ?? payments.error;

  useEffect(() => {
    if (error) accessError(error);
  }, [error, accessError]);

  async function reload() {
    await Promise.all([rows.refetch(), payments.refetch()]);
  }

  return {
    rows,
    payments,
    error,
    reload,
    loading: rows.isLoading || payments.isLoading,
    fetching: rows.isFetching || payments.isFetching,
  };
}
