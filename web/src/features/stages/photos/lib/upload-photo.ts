import { createChecklistItemPhoto } from '@api/clients/createChecklistItemPhoto';
import { createFileUpload } from '@api/clients/createFileUpload';

import type { PhotoUpload } from '../model/types';
import { preparePhoto } from './prepare-photo';
import { completePhotoUpload, recoverUpload } from './recover-upload';

function expiredTransfer(status: number, session: NonNullable<PhotoUpload['session']>): Partial<PhotoUpload> {
  return status === 403 ? { session: { ...session, expiresAt: new Date(0).toISOString() } } : {};
}

export async function uploadPhoto(
  original: PhotoUpload,
  itemId: number,
  signal: AbortSignal,
  save: (item: PhotoUpload) => Promise<void>,
) {
  let item = { ...original };

  async function checkpoint(values: Partial<PhotoUpload>) {
    signal.throwIfAborted();
    item = { ...item, ...values };
    await save(item);
    signal.throwIfAborted();
  }

  if (item.attached) return;
  signal.throwIfAborted();

  if (!item.prepared) await checkpoint({ prepared: await preparePhoto(item.file) });
  const file = item.prepared;
  if (!file) throw new Error('Не удалось подготовить фото.');

  if (!item.checksum) {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    await checkpoint({ checksum });
  }

  await checkpoint(await recoverUpload(item, signal));

  if (!item.fileId) {
    if (!item.session) {
      const session = await createFileUpload({
        body: {
          purpose: 'checklist_photo',
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          checksumSha256: item.checksum ?? '',
        },
        signal,
      }).unwrap();
      await checkpoint({ session });
    }

    const session = item.session;
    if (!session) throw new Error('Не найдена сессия загрузки.');

    const response = await fetch(session.uploadUrl, {
      method: session.method,
      headers: session.headers,
      body: file,
      credentials: 'omit',
      signal,
    });
    if (!response.ok) {
      await checkpoint(expiredTransfer(response.status, session));
      throw new Error('Не удалось передать фото. Повторите загрузку.');
    }
    await checkpoint({ transferred: true });
    const uploaded = await completePhotoUpload(item, signal);
    await checkpoint({ fileId: uploaded.id });
  }

  signal.throwIfAborted();
  await createChecklistItemPhoto({ path: { itemId }, body: { fileId: item.fileId ?? 0 }, signal }).unwrap();
  await checkpoint({ attached: true, status: 'uploaded', error: undefined });
}
