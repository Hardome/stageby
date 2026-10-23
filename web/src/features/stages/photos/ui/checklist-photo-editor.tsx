import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';

import type { ChecklistItem, Stage } from '@api/types';

import { usePhotoEditor } from '../lib/use-photo-editor';
import { PhotoDeletionDialog } from './photo-deletion-dialog';
import { PhotoPicker } from './photo-picker';
import { PhotoTile } from './photo-tile';
import { PhotoUploadItem } from './photo-upload-item';
import { PhotoViewer } from './photo-viewer';
import { PhotosSkeleton } from './photos-skeleton';

interface ChecklistPhotoEditorProperties {
  stage: Stage;
  item: ChecklistItem;
  version: number;
  canEdit: boolean;
  onComplete: () => void | Promise<void>;
}

function hasCompletedItemDetails(item: ChecklistItem) {
  return Boolean(item.isCompleted && item.completedBy && item.completedAt);
}

function shouldShowCompletionActions(item: ChecklistItem, canEdit: boolean, hasNoAssignee: boolean) {
  return (canEdit && !hasCompletedItemDetails(item)) || hasNoAssignee;
}

export function ChecklistPhotoEditor({
  stage,
  item,
  version,
  canEdit,
  onComplete,
}: Readonly<ChecklistPhotoEditorProperties>) {
  const {
    query,
    queue,
    state,
    pending,
    available,
    actions,
    selected,
    setSelected,
    photos,
    isUploading,
    canComplete,
    isUnavailable,
    feedback,
  } = usePhotoEditor(stage, item, version, canEdit, onComplete);

  if (isUnavailable) return <NotFound />;

  const hasCompletionDetails = hasCompletedItemDetails(item);
  const hasNoAssignee = stage.assignee === null;

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <PhotoPicker
          disabled={!state.loaded || !query.data || Boolean(query.error) || actions.busy}
          available={available}
          onSelect={(files) => {
            void queue.select(files, photos.length);
          }}
        />
      )}
      {state.storageFailed && (
        <Alert>
          <AlertDescription>
            Не удалось сохранить очередь на устройстве. Можно продолжить в этой вкладке; перезагрузка потеряет
            незавершённые файлы.
          </AlertDescription>
        </Alert>
      )}
      {feedback && (
        <Alert variant="destructive">
          <AlertDescription>
            {feedback}
            <Button variant="outline" onClick={() => void actions.refresh()}>
              Обновить данные
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {actions.success && (
        <Alert>
          <AlertDescription role="status">{actions.success}</AlertDescription>
        </Alert>
      )}
      {pending.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Очередь фото">
          {pending.map((entry) => (
            <PhotoUploadItem
              key={entry.id}
              item={entry}
              disabled={!canEdit || actions.busy}
              onRetry={() => void queue.retry(entry.id)}
              onRemove={() => void queue.remove(entry.id)}
            />
          ))}
        </ul>
      )}
      <DataRegion
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        skeleton={<PhotosSkeleton />}
        label="Обновляем фото…"
      >
        {query.data?.length === 0 && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Фото не приложены</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {photos.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              canEdit={canEdit}
              busy={actions.busy || isUploading}
              onOpen={() => setSelected(photo.id)}
              onDelete={() => void actions.remove(photo)}
            />
          ))}
        </div>
      </DataRegion>
      {shouldShowCompletionActions(item, canEdit, hasNoAssignee) && (
        <div className="flex flex-col gap-2 border-t pt-4">
          {canEdit && item.requiresRework && (
            <p className="text-sm">Для доработки требуется фото, загруженное после возврата пункта.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {canEdit && !hasCompletionDetails && (
              <Button disabled={!canComplete || actions.busy} onClick={() => void actions.done()}>
                {actions.busy ? 'Сохранение…' : 'Готово'}
              </Button>
            )}
            {hasNoAssignee && (
              <p className="text-sm text-muted-foreground">Чтобы завершить пункт чек-листа, назначьте мастера.</p>
            )}
          </div>
        </div>
      )}
      <PhotoViewer photos={photos} selected={selected} onSelect={setSelected} />
      <PhotoDeletionDialog
        open={Boolean(actions.confirmation)}
        busy={actions.busy}
        onCancel={() => actions.setConfirmation(undefined)}
        onConfirm={() => {
          if (actions.confirmation) void actions.remove(actions.confirmation, true);
        }}
      />
    </div>
  );
}
