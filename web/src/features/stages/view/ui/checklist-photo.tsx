import { useEffect } from 'react';

import { cn } from 'cn';
import { ArrowUpRightIcon, UserRoundIcon } from 'lucide-react';

import { useAccessError } from '@shared/lib/hooks';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { Skeleton } from '@shared/ui/skeleton';

import { useGetFileContent } from '@api/queries/useGetFileContent';
import type { ChecklistItemPhoto } from '@api/types';

interface ChecklistPhotoProperties {
  photo: ChecklistItemPhoto;
}

export function ChecklistPhoto({ photo }: ChecklistPhotoProperties) {
  const query = useGetFileContent({ path: { fileId: photo.fileId } }, { query: { retry: false, staleTime: 0 } });
  const accessError = useAccessError();
  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  return (
    <figure
      className={cn(
        'group/photo flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card',
        'text-card-foreground',
      )}
    >
      <DataRegion
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        skeleton={<Skeleton className="aspect-[16/10] w-full rounded-none" />}
      >
        {query.data && (
          <a
            href={query.data.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'relative block bg-secondary text-secondary-foreground outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            )}
          >
            <img
              src={query.data.downloadUrl}
              alt={`Фото ${photo.position}`}
              className={cn(
                'aspect-[16/10] w-full object-cover transition-opacity',
                'group-hover/photo:opacity-90 motion-reduce:transition-none',
              )}
            />
            <span
              className={cn(
                'flex items-center justify-between gap-2 border-t bg-card px-4 py-3',
                'font-semibold text-card-foreground text-sm',
              )}
            >
              Открыть фото {photo.position}
              <ArrowUpRightIcon className="size-4 text-primary-text" aria-hidden="true" />
            </span>
          </a>
        )}
      </DataRegion>
      {query.error && (
        <div role="alert">
          <p>Не удалось открыть фото.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Повторить
          </Button>
        </div>
      )}
      <figcaption className="wrap-anywhere flex items-center gap-2 border-t px-4 py-3 text-muted-foreground text-xs">
        <UserRoundIcon className="size-3.5 shrink-0" aria-hidden="true" />
        {photo.uploadedBy.fullName}
      </figcaption>
    </figure>
  );
}
