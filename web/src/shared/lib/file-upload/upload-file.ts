import type { FileUpload } from '@api/types';

import { inspectFile } from './inspect-file';
import type { UploadItem } from './types';
import { completeUpload, createUploadSession, recoverExpiredUpload } from './upload-session';

export interface FileTransfer extends UploadItem {
  key: string;
  checksum?: string;
  session?: FileUpload;
  fileId?: number;
}

export async function uploadFile(
  item: FileTransfer,
  update: (values: Partial<FileTransfer>) => void,
  purpose: 'project_document' | 'material_invoice',
  mimeType: 'application/pdf' | 'image/jpeg',
) {
  if (item.fileId) return;
  const checksum = await inspectFile(item.file, mimeType, item.checksum);
  let session = item.session;
  let key = item.key;

  if (session && isExpired(session)) {
    const recoveredFileId = await recoverExpiredUpload(session, checksum, key);
    if (recoveredFileId !== null) {
      update({ fileId: recoveredFileId });
      return;
    }

    key = crypto.randomUUID();
  }

  if (!session || isExpired(session)) {
    session = await createUploadSession(item.file, purpose, mimeType, checksum);
  }

  update({ session, checksum, key });
  const response = await fetch(session.uploadUrl, {
    method: session.method,
    headers: session.headers,
    body: item.file,
    credentials: 'omit',
  });
  if (!response.ok) throw new Error('Не удалось передать файл. Повторите загрузку.');

  const file = await completeUpload(session, checksum, key);
  update({ fileId: file.id });
}

function isExpired(session?: FileUpload) {
  return !session || Date.parse(session.expiresAt) <= Date.now();
}
