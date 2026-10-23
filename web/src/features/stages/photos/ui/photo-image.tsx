import { useState } from 'react';

import { cn } from 'cn';

import { DataRegion } from '@shared/ui/data-region';
import { Spinner } from '@shared/ui/spinner';

import type { ChecklistItemPhoto } from '@api/types';

import { usePhotoImage } from '../lib/use-photo-image';
import { PhotoImageError } from './photo-image-error';
import { PhotoImageSkeleton } from './photo-image-skeleton';

interface PhotoImageProperties {
  photo: ChecklistItemPhoto;
  fullscreen?: boolean;
  onOpen?: () => void;
}

export function PhotoImage({ photo, fullscreen = false, onOpen }: Readonly<PhotoImageProperties>) {
  const { query, hasError, retry, handleImageError } = usePhotoImage(photo.fileId);
  const [loadedUrl, setLoadedUrl] = useState<string>();
  const isImageLoading = query.data && loadedUrl !== query.data.downloadUrl;

  const picture = query.data && (
    <img
      src={query.data.downloadUrl}
      alt={`Фото ${photo.position}`}
      draggable={false}
      className={cn(
        'w-full',
        fullscreen ? 'max-h-[70dvh] object-contain' : 'aspect-square object-cover',
        onOpen &&
          cn(
            'transition-transform duration-200 ease-out',
            'group-hover/photo:scale-105 group-focus-visible/photo:scale-105',
            'motion-reduce:transform-none motion-reduce:transition-none',
          ),
      )}
      onError={handleImageError}
      onLoad={() => setLoadedUrl(query.data.downloadUrl)}
    />
  );

  const content = onOpen ? (
    <button
      type="button"
      className={cn(
        'group/photo block w-full cursor-pointer overflow-hidden outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      )}
      aria-label={`Открыть фото ${photo.position}`}
      onClick={onOpen}
    >
      {picture}
    </button>
  ) : (
    picture
  );

  return (
    <>
      {hasError && <PhotoImageError onRetry={retry} />}
      <DataRegion
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        skeleton={<PhotoImageSkeleton />}
        label="Обновляем ссылку на фото…"
      >
        {!hasError && (
          <div className="relative" aria-busy={isImageLoading}>
            {content}
            {isImageLoading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/40">
                <Spinner className="size-6" aria-label="Загрузка фотографии" />
              </div>
            )}
          </div>
        )}
      </DataRegion>
    </>
  );
}
