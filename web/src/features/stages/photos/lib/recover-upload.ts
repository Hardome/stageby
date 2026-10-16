import { completeFileUpload } from '@api/clients/completeFileUpload';

import type { PhotoUpload } from '../model/types';
import { photoFailure } from './photo-failure';

export function completePhotoUpload(item: PhotoUpload, signal: AbortSignal) {
  if (!item.session || !item.checksum) throw new Error('Не найдена сессия загрузки.');

  return completeFileUpload({
    path: { uploadId: item.session.fileId },
    headers: { 'Idempotency-Key': item.completionKey },
    body: { checksumSha256: item.checksum },
    signal,
  }).unwrap();
}

export async function recoverUpload(item: PhotoUpload, signal: AbortSignal): Promise<Partial<PhotoUpload>> {
  if (item.fileId || !item.session) return {};
  if (!item.transferred && Date.parse(item.session.expiresAt) > Date.now()) return {};

  try {
    const uploaded = await completePhotoUpload(item, signal);

    return { fileId: uploaded.id };
  } catch (error) {
    const failure = photoFailure(error);
    if (failure?.status !== 409) throw error;
    const code = failure.data?.code;
    if (code === 'upload_expired')
      return { session: undefined, transferred: false, completionKey: crypto.randomUUID() };
    if (code !== 'upload_incomplete') throw error;

    return { transferred: false };
  }
}
