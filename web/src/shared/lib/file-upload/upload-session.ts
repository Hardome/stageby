import { completeFileUpload } from '@api/clients/completeFileUpload';
import { createFileUpload } from '@api/clients/createFileUpload';
import type { FileUpload } from '@api/types';

export async function completeUpload(session: FileUpload, checksum: string, key: string) {
  return completeFileUpload({
    path: { uploadId: session.fileId },
    body: { checksumSha256: checksum },
    headers: { 'Idempotency-Key': key },
  }).unwrap();
}

export async function recoverExpiredUpload(session: FileUpload, checksum: string, key: string): Promise<number | null> {
  try {
    const file = await completeUpload(session, checksum, key);

    return file.id;
  } catch (error) {
    const failure = error as { status?: number; data?: { code?: string } };
    const isExpired = failure.status === 409 && failure.data?.code === 'upload_expired';
    if (!isExpired) throw error;

    return null;
  }
}

export function createUploadSession(
  file: File,
  purpose: 'project_document' | 'material_invoice',
  mimeType: 'application/pdf' | 'image/jpeg',
  checksum: string,
) {
  return createFileUpload({
    body: {
      purpose,
      originalName: file.name,
      mimeType,
      sizeBytes: file.size,
      checksumSha256: checksum,
    },
  }).unwrap();
}
