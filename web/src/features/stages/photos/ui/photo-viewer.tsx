import { useRef } from 'react';

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@shared/ui/dialog';

import type { ChecklistItemPhoto } from '@api/types';

import { PhotoImage } from './photo-image';
import { PhotoUploadDetails } from './photo-upload-details';

interface PhotoViewerProperties {
  photos: ChecklistItemPhoto[];
  selected?: number;
  onSelect: (id?: number) => void;
}

export function PhotoViewer({ photos, selected, onSelect }: PhotoViewerProperties) {
  const touch = useRef<number | undefined>(undefined);
  const index = photos.findIndex((photo) => photo.id === selected);
  const photo = photos[index];

  function move(direction: number) {
    const next = photos[index + direction];
    if (next) onSelect(next.id);
  }

  return (
    <Dialog
      open={Boolean(photo)}
      onOpenChange={(open) => {
        if (!open) onSelect();
      }}
    >
      <DialogContent
        fullscreen
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') move(-1);
          else if (event.key === 'ArrowRight') move(1);
        }}
      >
        <div className="flex items-center justify-between gap-3 p-4">
          <DialogTitle>
            Фото {index + 1} из {photos.length}
          </DialogTitle>
          <Button variant="ghost" size="icon" aria-label="Закрыть просмотр" onClick={() => onSelect()}>
            <XIcon />
          </Button>
        </div>
        {photo && (
          <div className="px-4">
            <PhotoUploadDetails photo={photo} />
          </div>
        )}
        <DialogDescription className="sr-only">Листайте стрелками или смахивайте фотографии.</DialogDescription>
        <div
          className="flex min-h-0 flex-1 touch-pan-y flex-col justify-center overflow-auto"
          onTouchStart={(event) => {
            touch.current = event.touches[0]?.clientX;
          }}
          onTouchEnd={(event) => {
            const end = event.changedTouches[0]?.clientX;
            if (end !== undefined && touch.current !== undefined && Math.abs(end - touch.current) > 50)
              move(end < touch.current ? 1 : -1);
            touch.current = undefined;
          }}
        >
          {photo && <PhotoImage key={photo.id} photo={photo} fullscreen />}
        </div>
        <div className="flex justify-center gap-3 p-4">
          <Button variant="outline" disabled={index <= 0} aria-label="Предыдущее фото" onClick={() => move(-1)}>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            disabled={index >= photos.length - 1}
            aria-label="Следующее фото"
            onClick={() => move(1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
