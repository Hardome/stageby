import { useEffect, useState } from 'react';

import { useAccessError } from '@shared/lib/hooks';

import { useGetProjectEdit } from '@api/queries/useGetProjectEdit';
import type { ProjectEdit } from '@api/types';

export function useProjectEditor(projectId: number, onDirtyChange: (isDirty: boolean) => void) {
  const query = useGetProjectEdit({ path: { projectId } }, { query: { retry: false, refetchOnMount: 'always' } });
  const [snapshot, setSnapshot] = useState<ProjectEdit | null>(null);
  const [revision, setRevision] = useState(0);
  const accessError = useAccessError();

  // При входе ждём свежий снимок; последующие обновления не заменяют правки и исходные версии.
  if (snapshot === null && query.isFetchedAfterMount && query.isSuccess && !query.isFetching) setSnapshot(query.data);

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  async function reload() {
    const result = await query.refetch();
    if (result.error || !result.data) throw new Error('Не удалось загрузить объект.');
    setSnapshot(result.data);
    setRevision((previous) => previous + 1);
    onDirtyChange(false);
  }

  return { query, snapshot, revision, reload };
}
