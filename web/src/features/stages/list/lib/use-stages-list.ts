import { useEffect } from 'react';

import { useAccessError } from '@shared/lib/hooks';

import { useListStages } from '@api/queries/useListStages';

import { stagePageSize } from '../model/data';
import type { MyStagesSearch } from '../model/types';
import { getStagesQuery } from './stage-search';

export function useStagesList(search: MyStagesSearch, onPageChange: (offset: number, shouldReplace?: boolean) => void) {
  const query = useListStages({ query: getStagesQuery(search) }, { query: { retry: false } });
  const handleAccessError = useAccessError();
  const offset = search.offset ?? 0;

  useEffect(() => {
    if (query.error) handleAccessError(query.error);
  }, [query.error, handleAccessError]);

  useEffect(() => {
    if (!(query.isSuccess && !query.isFetching && offset > 0 && offset >= query.data.total)) return;

    const lastOffset = Math.max(0, Math.ceil(query.data.total / stagePageSize) - 1) * stagePageSize;
    onPageChange(lastOffset, true);
  }, [query.isSuccess, query.isFetching, query.data, offset, onPageChange]);

  return query;
}
