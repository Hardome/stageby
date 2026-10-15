import { useEffect } from 'react';

import { cn } from 'cn';
import { CameraIcon, ImageOffIcon, LockKeyholeIcon, RotateCcwIcon, ScanLineIcon } from 'lucide-react';

import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';

import { useListChecklistItemPhotos } from '@api/queries/useListChecklistItemPhotos';
import type { ChecklistItem } from '@api/types';

import { ChecklistPhoto } from './checklist-photo';
import { ChecklistPhotosSkeleton } from './checklist-photos-skeleton';

interface ChecklistPhotosProperties {
  item: ChecklistItem;
  canEdit: boolean;
}

export function ChecklistPhotos({ item, canEdit }: ChecklistPhotosProperties) {
  const completion = item.isCompleted ? 'Готово' : 'Не выполнено';
  const completionVariant = item.isCompleted ? 'success' : 'secondary';
  const query = useListChecklistItemPhotos({ path: { itemId: item.id } }, { query: { retry: false } });
  const accessError = useAccessError();
  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);
  if (query.error?.status === 404) return <NotFound />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="wrap-anywhere flex items-start gap-3">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg border',
                'bg-secondary font-bold text-secondary-foreground tabular-nums',
              )}
            >
              {String(item.position).padStart(2, '0')}
            </span>
            <span className="pt-1">{item.title}</span>
          </h2>
        </CardTitle>
        <CardDescription>Фотографии и замечания к выполнению</CardDescription>
        <CardAction>
          <Badge variant={item.requiresRework ? 'warning' : completionVariant}>
            {item.requiresRework ? 'Доработка' : completion}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {item.photoHint && (
          <div className="flex items-start gap-3 rounded-xl border bg-secondary p-4 text-secondary-foreground">
            <ScanLineIcon className="mt-0.5 size-5 shrink-0 text-primary-text" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-semibold text-sm">Что должно быть на фото</p>
              <p className="wrap-anywhere text-muted-foreground text-sm leading-relaxed">{item.photoHint}</p>
            </div>
          </div>
        )}
        {item.reworkComment && (
          <Alert>
            <RotateCcwIcon className="text-primary-text" aria-hidden="true" />
            <AlertTitle>Замечание руководителя</AlertTitle>
            <AlertDescription className="wrap-anywhere">Замечание: {item.reworkComment}</AlertDescription>
          </Alert>
        )}
        {!canEdit && (
          <p className="flex items-center gap-2 text-muted-foreground text-sm">
            <LockKeyholeIcon className="size-4" aria-hidden="true" />
            Доступен только просмотр.
          </p>
        )}
        {item.photosDeletedByRetention && (
          <Alert>
            <ImageOffIcon aria-hidden="true" />
            <AlertTitle>Срок хранения фото истёк</AlertTitle>
            <AlertDescription>Фото удалены по сроку хранения. Выполнение сохраняется.</AlertDescription>
          </Alert>
        )}
        {query.error && (
          <Alert variant="destructive">
            <AlertDescription>
              Не удалось загрузить фото.{' '}
              <Button variant="outline" onClick={() => void query.refetch()}>
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <DataRegion
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          skeleton={<ChecklistPhotosSkeleton />}
          label="Обновляем фото…"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <CameraIcon className="size-4 text-primary-text" aria-hidden="true" />
              Галерея пункта
            </h3>
            {query.data && <Badge variant="outline">Фото: {query.data.length}</Badge>}
          </div>
          {query.data?.length === 0 && (
            <Empty className="min-h-40 border bg-secondary/40">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CameraIcon />
                </EmptyMedia>
                <EmptyTitle>Фото не приложены</EmptyTitle>
                <EmptyDescription>
                  {item.photosDeletedByRetention
                    ? 'Сохранённые ранее снимки больше недоступны. Статус пункта остаётся прежним.'
                    : 'Здесь появятся фотографии этой контрольной точки.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {query.data && query.data.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {query.data
                .toSorted((left, right) => left.position - right.position)
                .map((photo) => (
                  <ChecklistPhoto key={photo.id} photo={photo} />
                ))}
            </div>
          )}
        </DataRegion>
      </CardContent>
    </Card>
  );
}
