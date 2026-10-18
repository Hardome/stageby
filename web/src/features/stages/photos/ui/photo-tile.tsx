import { Button } from '@shared/ui/button';

import type { ChecklistItemPhoto } from '@api/types';

import { PhotoImage } from './photo-image';
import { PhotoUploadDetails } from './photo-upload-details';

interface PhotoTileProperties {
  photo: ChecklistItemPhoto;
  canEdit: boolean;
  busy: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

export function PhotoTile({ photo, canEdit, busy, onOpen, onDelete }: PhotoTileProperties) {
  return (
    <figure className="flex min-w-0 flex-col overflow-hidden rounded-xl border">
      <PhotoImage photo={photo} onOpen={onOpen} />
      <figcaption className="flex flex-col gap-1 p-1 sm:p-2">
        <Button variant="ghost" size="sm" onClick={onOpen}>
          Фото {photo.position}
        </Button>
        <PhotoUploadDetails photo={photo} />
        {canEdit && (
          <Button variant="outline" size="sm" disabled={busy} onClick={onDelete}>
            Удалить
          </Button>
        )}
      </figcaption>
    </figure>
  );
}
