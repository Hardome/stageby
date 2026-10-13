import { useId } from 'react';

import { cn } from 'cn';
import { UploadIcon } from 'lucide-react';
import { type Accept, useDropzone } from 'react-dropzone';

import { fileRejectionMessage, type UploadItem } from '@shared/lib/file-upload';

import { Alert, AlertDescription } from './alert';
import { Field, FieldDescription, FieldLabel } from './field';
import { UploadItem as UploadItemRow } from './upload-item';

interface UploaderProperties<T extends UploadItem> {
  id?: string;
  items: T[];
  label: string;
  description?: string;
  listLabel?: string;
  error?: string;
  disabled?: boolean;
  compact?: boolean;
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  validateFile?: (file: File) => string | undefined;
  onSelect: (files: File[]) => void;
  onReject: (message: string) => void;
  onRetry: (item: T) => void;
  onRemove: (id: string) => void;
}

export function Uploader<T extends UploadItem>({
  id,
  items,
  label,
  description,
  listLabel = 'Загружаемые файлы',
  error,
  disabled = false,
  compact = false,
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
      if (rejections.length > 0) onReject(rejections.map((item) => fileRejectionMessage(item, validateFile)).join(' '));
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
            'flex items-center gap-3 rounded-(--radius-control) border border-dashed p-5',
            compact ? 'min-h-24 flex-row text-left' : 'min-h-32 flex-col justify-center text-center',
            'text-sm outline-none',
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
        <span
          className={cn(
            'flex shrink-0 items-center justify-center',
            compact && 'size-10 rounded-(--radius-control) bg-muted text-muted-foreground',
          )}
        >
          <UploadIcon aria-hidden="true" className="size-5 text-muted-foreground" />
        </span>
        <p>{isDragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы сюда или нажмите для выбора'}</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription id={errorId}>{error}</AlertDescription>
        </Alert>
      )}
      <ul className="flex flex-col gap-2 empty:hidden" aria-label={listLabel} aria-live="polite">
        {items.map((item) => (
          <UploadItemRow key={item.id} item={item} disabled={disabled} onRetry={onRetry} onRemove={onRemove} />
        ))}
      </ul>
    </Field>
  );
}
