import { FileCheckIcon, FileTextIcon, Trash2Icon } from 'lucide-react';

import type { UploadItem as UploadItemModel } from '@shared/lib/file-upload';

import { Button } from './button';
import { Spinner } from './spinner';

interface UploadItemProperties<T extends UploadItemModel> {
  item: T;
  disabled: boolean;
  onRetry: (item: T) => void;
  onRemove: (id: string) => void;
}

export function UploadItem<T extends UploadItemModel>({ item, disabled, onRetry, onRemove }: UploadItemProperties<T>) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-3 rounded-(--radius-control) border p-3">
      {item.status === 'uploading' && <Spinner />}
      {item.status === 'uploaded' && <FileCheckIcon aria-hidden="true" className="size-5 shrink-0 text-success" />}
      {item.status === 'failed' && <FileTextIcon aria-hidden="true" className="size-5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="wrap-anywhere font-medium">{item.file.name}</p>
        <p className="text-muted-foreground text-sm">
          {(item.file.size / 1024 / 1024).toFixed(1)} МБ ·{' '}
          {{ uploading: 'Загрузка…', uploaded: 'Загружен', failed: 'Ошибка загрузки' }[item.status]}
        </p>
        {item.error && <p className="wrap-anywhere text-destructive text-sm">{item.error}</p>}
      </div>
      {item.status === 'failed' && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onRetry(item)}>
          Повторить
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || item.status === 'uploading'}
        aria-label={`Убрать файл ${item.file.name}`}
        title={`Убрать файл ${item.file.name}`}
        onClick={() => onRemove(item.id)}
      >
        <Trash2Icon />
      </Button>
    </li>
  );
}
