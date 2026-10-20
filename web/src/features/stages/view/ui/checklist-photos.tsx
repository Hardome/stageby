import type { ReactNode } from 'react';

import { ImageOffIcon, RotateCcwIcon, ScanLineIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Card, CardContent } from '@shared/ui/card';

import type { ChecklistItem } from '@api/types';

interface ChecklistPhotosProperties {
  item: ChecklistItem;
  children: ReactNode;
}

export function ChecklistPhotos({ item, children }: ChecklistPhotosProperties) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {item.photoHint && (
          <div className="flex items-start gap-3 rounded-xl border bg-secondary p-4 text-secondary-foreground">
            <ScanLineIcon className="mt-0.5 size-5 shrink-0 text-primary-text" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-bold text-foreground text-sm">Что должно быть на фото</p>
              <p className="wrap-anywhere text-muted-foreground text-sm leading-relaxed">{item.photoHint}</p>
            </div>
          </div>
        )}
        {item.reworkComment && (
          <Alert variant="warning">
            <RotateCcwIcon aria-hidden="true" />
            <AlertTitle>Замечание руководителя</AlertTitle>
            <AlertDescription className="wrap-anywhere">Замечание: {item.reworkComment}</AlertDescription>
          </Alert>
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
