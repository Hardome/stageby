import { completeFileUpload } from '@api/clients/completeFileUpload';
import { createFileUpload } from '@api/clients/createFileUpload';
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
  const buffer = await document.file.arrayBuffer();
  if (new TextDecoder().decode(buffer.slice(0, 5)) !== '%PDF-') throw new Error('Содержимое файла не является PDF.');
  const checksum =
    document.checksum ??
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), (byte) =>
      Number(byte).toString(16).padStart(2, '0'),
    ).join('');

  let session = document.session;

  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    session = await createFileUpload({
      body: {
        purpose: 'project_document',
        originalName: document.file.name,
        mimeType: 'application/pdf',
        sizeBytes: document.file.size,
        checksumSha256: checksum,
      },
    }).unwrap();
  }

  update({ session, checksum });

  const response = await fetch(session.uploadUrl, {
    method: session.method,
    headers: session.headers,
    body: document.file,
    credentials: 'omit',
  });

  if (!response.ok) throw new Error('Не удалось передать PDF. Повторите загрузку.');

  const file = await completeFileUpload({
    path: { uploadId: session.fileId },
    body: { checksumSha256: checksum },
    headers: { 'Idempotency-Key': document.key },
  }).unwrap();

  update({ fileId: file.id, status: 'uploaded', error: undefined });
}
