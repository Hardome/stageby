import { useEffect, useState } from 'react';

import { useAccessError } from '@shared/lib/hooks';

import { useListChecklistItemPhotos } from '@api/queries/useListChecklistItemPhotos';
import type { ChecklistItem, Stage } from '@api/types';

import { hasCompletionPhoto } from './has-completion-photo';
import { usePhotoActions } from './use-photo-actions';
import { usePhotoQueue } from './use-photo-queue';

export function usePhotoEditor(
  stage: Stage,
  item: ChecklistItem,
  version: number,
  canEdit: boolean,
  onComplete: () => void | Promise<void>,
) {
  const query = useListChecklistItemPhotos({ path: { itemId: item.id } }, { query: { retry: false } });
  const uploads = usePhotoQueue(stage, item.id, canEdit && !query.error, query.data);
  const actions = usePhotoActions(stage, item, version, onComplete);
  const accessError = useAccessError();
  const [selected, setSelected] = useState<number>();
  const photos = query.data?.toSorted((left, right) => left.position - right.position) ?? [];
  const isUploading = uploads.pending.some((entry) => entry.status === 'uploading' || entry.status === 'waiting');
  const canComplete =
    canEdit &&
    stage.assignee !== null &&
    stage.status !== 'acceptance' &&
    !item.isCompleted &&
    hasCompletionPhoto(stage, item, photos) &&
    uploads.pending.length === 0 &&
    !query.isFetching &&
    !query.error &&
    uploads.state.loaded;
  const isUnavailable = query.error?.status === 403 || query.error?.status === 404;
  const feedback = uploads.state.error || actions.error || (query.error ? 'Не удалось загрузить фото.' : '');

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  return {
    ...uploads,
    query,
    actions,
    selected,
    setSelected,
    photos,
    isUploading,
    canComplete,
    isUnavailable,
    feedback,
  };
}
