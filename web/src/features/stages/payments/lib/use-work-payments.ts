import { useEffect } from 'react';

import { useAccessError } from '@shared/lib/hooks';

import { useListWorkPayments } from '@api/queries/useListWorkPayments';

export function useWorkPayments(stageId: number) {
  const payments = useListWorkPayments({ path: { stageId } }, { query: { retry: false } });
  const accessError = useAccessError();
  const error = payments.error;

  useEffect(() => {
    if (error) accessError(error);
  }, [error, accessError]);

  async function reload() {
    await payments.refetch();
  }

  return {
    payments,
    error,
    reload,
    loading: payments.isLoading,
    fetching: payments.isFetching,
  };
}
