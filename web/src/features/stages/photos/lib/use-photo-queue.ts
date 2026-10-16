import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { invalidateStage } from '@entities/stage';
import { useAuth } from '@shared/context';
import { useAccessError } from '@shared/lib/hooks';
import { subscribeUploadSession, uploadSession } from '@shared/lib/storage';

import { listChecklistItemPhotosQueryKey } from '@api/queries/useListChecklistItemPhotos';
import type { ChecklistItemPhoto, Stage } from '@api/types';

import { photoQueue } from './photo-queue';

export function usePhotoQueue(stage: Stage, itemId: number, canEdit: boolean, photos?: ChecklistItemPhoto[]) {
  const { user } = useAuth();
  const client = useQueryClient();
  const accessError = useAccessError();
  const queue = useMemo(() => photoQueue(user?.id ?? 0, itemId), [user?.id, itemId]);
  const state = useSyncExternalStore(queue.subscribe, queue.snapshot);

  useEffect(() => {
    let isRunning = false;
    const controller = new AbortController();

    async function refresh() {
      await client.invalidateQueries({ queryKey: listChecklistItemPhotosQueryKey({ path: { itemId } }) });
      await invalidateStage(client, stage);
    }

    async function run() {
      if (isRunning || !user || controller.signal.aborted) return;
      const session = uploadSession(user.id);
      if (!session.active) return;
      isRunning = true;
      const signal = AbortSignal.any([controller.signal, session.signal]);

      try {
        await queue.load();
        if (!canEdit || !photos) return;
        await queue.reconcile(photos.map((photo) => photo.fileId));

        while (queue.canProcess(signal)) {
          await queue.process(signal, refresh, (error) => {
            accessError(error);
            void refresh();
          });
        }
      } finally {
        isRunning = false;
      }
    }

    const unsubscribe = queue.subscribe(() => void run());
    const unsubscribeSession = subscribeUploadSession(() => void run());
    void run();

    return () => {
      controller.abort();
      unsubscribe();
      unsubscribeSession();
    };
  }, [queue, canEdit, user, photos, stage, client, accessError, itemId]);

  const pending = state.items.filter(
    (item) => !item.attached && !photos?.some((photo) => photo.fileId === item.fileId),
  );
  const reserved = state.items.filter((item) => !photos?.some((photo) => photo.fileId === item.fileId)).length;
  const available = Math.max(0, 20 - (photos?.length ?? 0) - reserved);

  return { queue, state, pending, available };
}
