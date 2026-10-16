import { uploadFile } from '@shared/lib/file-upload';

import { createFileUploadSchema as fileUploadSchema } from '@api/zod/createFileUploadSchema';

import type { DocumentUpload } from '../model/types';

export const maxDocumentSize = 50 * 1024 * 1024;

export function documentError(file: File): string | undefined {
  if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf'))
    return 'Выберите файл PDF.';
  if (file.size === 0) return 'Файл пустой.';
  if (!fileUploadSchema.shape.sizeBytes.safeParse(file.size).success) return 'Размер PDF не должен превышать 50 МБ.';
  if (!fileUploadSchema.shape.originalName.safeParse(file.name).success)
    return 'Имя файла не должно превышать 255 символов.';
}

export async function uploadDocument(document: DocumentUpload, update: (values: Partial<DocumentUpload>) => void) {
  await uploadFile(document, update, 'project_document', 'application/pdf');
  update({ status: 'uploaded', error: undefined });
}
