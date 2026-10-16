import { useEffect, useState } from 'react';

import { useAccessError } from '@shared/lib/hooks';

import { useGetFileContent } from '@api/queries/useGetFileContent';

export function usePhotoImage(fileId: number) {
  const query = useGetFileContent({ path: { fileId } }, { query: { retry: false, staleTime: 0 } });
  const accessError = useAccessError();
  const [renewed, setRenewed] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  function retry() {
    setBroken(false);
    setRenewed(false);
    void query.refetch();
  }

  function handleImageError() {
    if (renewed) setBroken(true);
    else {
      setRenewed(true);
      void query.refetch();
    }
  }

  return { query, hasError: broken || Boolean(query.error), retry, handleImageError };
}
