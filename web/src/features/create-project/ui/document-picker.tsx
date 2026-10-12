import { Uploader } from '@shared/ui/uploader';

import { documentError, maxDocumentSize } from '../lib/upload-document';
import type { DocumentUpload } from '../model/types';

interface DocumentPickerProperties {
  documents: DocumentUpload[];
  error: string;
  disabled: boolean;
  onSelect: (files: File[]) => void;
  onReject: (message: string) => void;
  onRetry: (document: DocumentUpload) => void;
  onRemove: (id: string) => void;
}

export function DocumentPicker({ documents, ...properties }: DocumentPickerProperties) {
  return (
    <Uploader
      {...properties}
      id="project-documents"
      items={documents}
      label="Проект (PDF)"
      description="Один или несколько PDF до 50 МБ каждый"
      listLabel="Файлы проекта"
      accept={{ 'application/pdf': ['.pdf'] }}
      maxSize={maxDocumentSize}
      validateFile={documentError}
    />
  );
}
