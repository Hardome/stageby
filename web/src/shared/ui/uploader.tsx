import { useId } from 'react';

import { cn } from 'cn';
import { FileCheckIcon, FileTextIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { type Accept, type FileRejection, useDropzone } from 'react-dropzone';

import type { UploadItem } from '@shared/lib/file-upload';

import { Alert, AlertDescription } from './alert';
import { Button } from './button';
import { Field, FieldDescription, FieldLabel } from './field';
import { Spinner } from './spinner';

interface UploaderProperties<T extends UploadItem> {
  id?: string;
  items: T[];
  label: string;
  description?: string;
  listLabel?: string;
  error?: string;
  disabled?: boolean;
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  validateFile?: (file: File) => string | undefined;
  onSelect: (files: File[]) => void;
  onReject: (message: string) => void;
  onRetry: (item: T) => void;
  onRemove: (id: string) => void;
}

function rejectionMessage(
  { file, errors }: FileRejection,
  validateFile?: UploaderProperties<UploadItem>['validateFile'],
) {
  const validation = validateFile?.(file);
  const messages = errors.map((error) => {
    switch (error.code) {
      case 'file-invalid-type': {
        return 'Недопустимый тип файла.';
      }
      case 'file-too-large': {
        return 'Файл превышает допустимый размер.';
      }
      case 'too-many-files': {
        return 'Выберите один файл.';
      }
      default: {
        return error.message;
      }
    }
  });
  return `${file.name}: ${validation ?? messages.join(' ')}`;
}

export function Uploader<T extends UploadItem>({
  id,
  items,
  label,
  description,
  listLabel = 'Загружаемые файлы',
  error,
  disabled = false,
  accept,
  multiple = true,
  maxSize,
  validateFile,
  onSelect,
  onReject,
  onRetry,
  onRemove,
}: UploaderProperties<T>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const describedBy = [description ? descriptionId : undefined, error ? errorId : undefined].filter(Boolean).join(' ');
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept,
    multiple,
    maxSize,
    disabled,
    validator: (file) => {
      const message = validateFile?.(file);
      return message ? { code: 'file-validation', message } : null;
    },
    onDrop: (acceptedFiles, rejections) => {
      if (disabled) return;
      onSelect(acceptedFiles);
      if (rejections.length > 0) onReject(rejections.map((item) => rejectionMessage(item, validateFile)).join(' '));
    },
  });

  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled}>
      <FieldLabel id={`${inputId}-label`} htmlFor={inputId}>
        {label}
      </FieldLabel>
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      <div
        {...getRootProps({
          role: 'button',
          'aria-labelledby': `${inputId}-label`,
          'aria-describedby': describedBy || undefined,
          'aria-invalid': Boolean(error),
          'aria-disabled': disabled,
          className: cn(
            'flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-5',
            'text-center text-sm outline-none',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            !disabled && 'cursor-pointer hover:bg-muted',
            isDragActive && 'border-ring bg-muted',
            (isDragReject || Boolean(error)) && 'border-destructive',
            disabled && 'opacity-50',
          ),
        })}
      >
        <input
          {...getInputProps({
            id: inputId,
            disabled,
            'aria-labelledby': `${inputId}-label`,
            'aria-describedby': describedBy || undefined,
            'aria-invalid': Boolean(error),
          })}
        />
        <UploadIcon aria-hidden="true" className="size-6 text-muted-foreground" />
        <p>{isDragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы сюда или нажмите для выбора'}</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription id={errorId}>{error}</AlertDescription>
        </Alert>
      )}
      <ul className="flex flex-col gap-3" aria-label={listLabel} aria-live="polite">
        {items.map((item) => (
          <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border p-3">
            {item.status === 'uploading' && <Spinner />}
            {item.status === 'uploaded' && (
              <FileCheckIcon aria-hidden="true" className="size-5 shrink-0 text-success" />
            )}
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
              <Button type="button" variant="outline" disabled={disabled} onClick={() => onRetry(item)}>
                Повторить
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || item.status === 'uploading'}
              aria-label={`Убрать файл ${item.file.name}`}
              onClick={() => onRemove(item.id)}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>
    </Field>
  );
}
