import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

import type { PhotoUpload } from '../model/types';

interface PhotoUploadItemProperties {
  item: PhotoUpload;
  disabled: boolean;
  onRetry: () => void;
  onRemove: () => void;
}

export function PhotoUploadItem({ item, disabled, onRetry, onRemove }: Readonly<PhotoUploadItemProperties>) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border p-3">
      {item.status === 'uploading' && <Spinner />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold wrap-anywhere">{item.file.name}</p>
        <p className="text-sm text-muted-foreground" role="status">
          {
            {
              waiting: 'Ожидает загрузки',
              uploading: 'Подготовка и загрузка…',
              failed: 'Ошибка загрузки',
              uploaded: 'Фото сохранено',
            }[item.status]
          }
        </p>
        {item.error && <p className="text-sm wrap-anywhere text-destructive">{item.error}</p>}
      </div>
      {item.status === 'failed' && (
        <Button variant="outline" size="sm" disabled={disabled} onClick={onRetry}>
          Повторить
        </Button>
      )}
      <Button variant="ghost" size="sm" disabled={disabled || item.status === 'uploading'} onClick={onRemove}>
        Убрать
      </Button>
    </li>
  );
}
