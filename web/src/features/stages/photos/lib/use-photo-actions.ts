import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { invalidateStage } from '@entities/stage';
import { useAccessError } from '@shared/lib/hooks';

import { deleteChecklistItemPhoto } from '@api/clients/deleteChecklistItemPhoto';
import { updateChecklistItem } from '@api/clients/updateChecklistItem';
import { listChecklistItemPhotosQueryKey } from '@api/queries/useListChecklistItemPhotos';
import type { ChecklistItem, ChecklistItemPhoto, Stage } from '@api/types';

import { photoFailure, photoFailureMessage } from './photo-failure';

export function usePhotoActions(
  stage: Stage,
  item: ChecklistItem,
  version: number,
  onComplete: () => void | Promise<void>,
) {
  const client = useQueryClient();
  const accessError = useAccessError();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmation, setConfirmation] = useState<ChecklistItemPhoto>();

  async function refresh() {
    await client.invalidateQueries({ queryKey: listChecklistItemPhotosQueryKey({ path: { itemId: item.id } }) });
    await invalidateStage(client, stage);
  }

  async function execute(action: () => Promise<unknown>, successMessage = '') {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await action();
      await refresh();
      setSuccess(successMessage);

      return true;
    } catch (error_) {
      accessError(error_);
      setError(photoFailureMessage(error_));
      if (photoFailure(error_)?.status === 409) await refresh();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function done() {
    const completed = await execute(async () => {
      await updateChecklistItem({
        path: { stageId: stage.id, itemId: item.id },
        body: { expectedVersion: version, isCompleted: true },
      }).unwrap();
    }, 'Пункт выполнен.');
    if (completed) await onComplete();
  }

  async function remove(photo: ChecklistItemPhoto, isConfirmed = false) {
    await execute(async () => {
      try {
        await deleteChecklistItemPhoto({
          path: { photoId: photo.id },
          query: isConfirmed ? { confirmLastPhotoDeletion: true } : undefined,
        }).unwrap();
        setConfirmation(undefined);
      } catch (error_) {
        if (photoFailure(error_)?.data?.code === 'photo_deletion_confirmation_required') {
          setConfirmation(photo);

          return;
        }

        throw error_;
      }
    });
  }

  return { busy, error, success, confirmation, setConfirmation, done, remove, refresh };
}
