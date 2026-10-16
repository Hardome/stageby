import { cn } from 'cn';

import { DataRegion } from '@shared/ui/data-region';
import { Skeleton } from '@shared/ui/skeleton';

import type { ChecklistItemPhoto } from '@api/types';

import { usePhotoImage } from '../lib/use-photo-image';
import { PhotoImageError } from './photo-image-error';

interface PhotoImageProperties {
  photo: ChecklistItemPhoto;
  fullscreen?: boolean;
  onOpen?: () => void;
}

export function PhotoImage({ photo, fullscreen = false, onOpen }: PhotoImageProperties) {
  const { query, hasError, retry, handleImageError } = usePhotoImage(photo.fileId);

  const picture = query.data && (
    <img
      src={query.data.downloadUrl}
      alt={`Фото ${photo.position}`}
      draggable={false}
      className={cn('w-full', fullscreen ? 'max-h-[70dvh] object-contain' : 'aspect-square object-cover')}
      onError={handleImageError}
    />
  );

  const content = onOpen ? (
    <button
      type="button"
      className={cn(
        'block w-full cursor-pointer outline-none',
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
        skeleton={<Skeleton className="aspect-square w-full" />}
        label="Обновляем ссылку на фото…"
      >
        {!hasError && content}
      </DataRegion>
    </>
  );
}
