import { useRef, useState } from 'react';

import type { UploadItem } from './types';

interface UseFileUploaderProperties<T extends UploadItem> {
  createItem: (file: File) => T;
  validateFile?: (file: File) => string | undefined;
  upload: (item: T, update: (values: Partial<T>) => void) => Promise<void>;
  onError?: (error: unknown) => void;
  errorMessage?: (error: unknown) => string;
}

export function useFileUploader<T extends UploadItem>({
  createItem,
  validateFile,
  upload,
  onError,
  errorMessage,
}: UseFileUploaderProperties<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState('');
  const currentItems = useRef<T[]>([]);
  const activeUploads = useRef(new Set<string>());

  function replaceItems(next: T[]) {
    currentItems.current = next;
    setItems(next);
  }

  function updateItem(id: string, values: Partial<T> | Partial<UploadItem>) {
    replaceItems(currentItems.current.map((item) => (item.id === id ? { ...item, ...values } : item)));
  }

  async function retry(selected: T) {
    const item = currentItems.current.find((candidate) => candidate.id === selected.id);
    if (!item || item.status === 'uploaded' || activeUploads.current.has(item.id)) return;
    activeUploads.current.add(item.id);
    updateItem(item.id, { status: 'uploading', error: undefined });
    try {
      await upload(item, (values) => updateItem(item.id, values));
      updateItem(item.id, { status: 'uploaded', error: undefined });
    } catch (uploadError) {
      updateItem(item.id, {
        status: 'failed',
        error: errorMessage?.(uploadError) ?? 'Не удалось загрузить файл. Повторите попытку.',
      });
      onError?.(uploadError);
    } finally {
      activeUploads.current.delete(item.id);
    }
  }

  function select(files: File[]) {
    const failures: string[] = [];
    const additions: T[] = [];
    for (const file of files) {
      const message = validateFile?.(file);
      if (message) failures.push(`${file.name}: ${message}`);
      else additions.push(createItem(file));
    }
    setError(failures.join(' '));
    replaceItems([...currentItems.current, ...additions]);
    for (const item of additions) void retry(item);
  }

  function remove(id: string) {
    if (activeUploads.current.has(id)) return;
    replaceItems(currentItems.current.filter((item) => item.id !== id));
  }

  return { items, error, select, retry, remove, setError };
}
