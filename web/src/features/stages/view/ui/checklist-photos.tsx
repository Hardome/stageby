import type { ReactNode } from 'react';

import { cn } from 'cn';
import { ImageOffIcon, LockKeyholeIcon, RotateCcwIcon, ScanLineIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

import type { ChecklistItem } from '@api/types';

interface ChecklistPhotosProperties {
  item: ChecklistItem;
  canEdit: boolean;
  children: ReactNode;
}

export function ChecklistPhotos({ item, canEdit, children }: ChecklistPhotosProperties) {
  const completion = item.isCompleted ? 'Готово' : 'Не выполнено';
  const completionVariant = item.isCompleted ? 'success' : 'secondary';

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
        {children}
      </CardContent>
    </Card>
  );
}
