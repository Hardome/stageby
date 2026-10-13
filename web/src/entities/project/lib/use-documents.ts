import { useFileUploader } from '@shared/lib/file-upload';
import { errorStatus } from '@shared/lib/hooks';

import type { DocumentUpload } from '../model/types';
import { documentError, uploadDocument } from './upload-document';

interface UseDocumentsProperties {
  onAccessError: (error: unknown) => void;
}

export function useDocuments({ onAccessError }: UseDocumentsProperties) {
  const { items, ...uploads } = useFileUploader<DocumentUpload>({
    createItem: (file) => ({ id: crypto.randomUUID(), key: crypto.randomUUID(), file, status: 'uploading' }),
    validateFile: documentError,
    upload: uploadDocument,
    onError: onAccessError,
    errorMessage: (error) => {
      const status = errorStatus(error);
      if (status === 401) return 'Сессия завершена. Войдите снова.';
      if (status === 403) return 'Недостаточно прав для загрузки PDF.';

      return error instanceof Error ? error.message : 'Не удалось загрузить PDF. Повторите попытку.';
    },
  });

  return { ...uploads, documents: items };
}
