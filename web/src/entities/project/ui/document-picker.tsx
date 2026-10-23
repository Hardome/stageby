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

export function DocumentPicker({ documents, ...properties }: Readonly<DocumentPickerProperties>) {
  return (
    <Uploader
      {...properties}
      id="project-documents"
      compact
      items={documents}
      label="Проект"
      description="Один или несколько PDF до 50 МБ каждый"
      listLabel="Файлы проекта"
      accept={{ 'application/pdf': ['.pdf'] }}
      maxSize={maxDocumentSize}
      validateFile={documentError}
    />
  );
}
