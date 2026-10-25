import { pauseUploadSession, resumeUploadSession, uploadSession } from '@shared/lib/storage';

import { PhotoQueue, photoQueue } from './photo-queue';

const storage = vi.hoisted(() => ({ records: new Map<string, unknown>(), isBroken: false }));
vi.mock('@shared/lib/storage/upload-storage', () => ({
  readUploadQueue: (user: number, scope: string) => Promise.resolve(storage.records.get(`${user}:${scope}`)),
  writeUploadQueue: async (user: number, scope: string, value: unknown) => {
    if (storage.isBroken) throw new Error('Storage unavailable');
    storage.records.set(`${user}:${scope}`, value);
    await Promise.resolve();
  },
  clearUploadStorage: async () => {
    storage.records.clear();
    await Promise.resolve();
  },
  reconcileUploadStorage: async (owner: number) => {
    if (storage.records.get('owner') !== owner) storage.records.clear();
    storage.records.set('owner', owner);
    await Promise.resolve();
  },
}));

function image() {
  return new File(['image'], 'image.jpg', { type: 'image/jpeg' });
}

describe('durable checklist photo queue', () => {
  beforeEach(async () => {
    pauseUploadSession(true);
    storage.records.clear();
    storage.isBroken = false;
    resumeUploadSession(1);
    await uploadSession(1).ready;
  });

  it('reserves remaining slots synchronously across multiple selections', async () => {
    const queue = new PhotoQueue(1, 7);
    await queue.load();

    await Promise.all([queue.select([image(), image()], 18), queue.select([image()], 18)]);

    expect(queue.state.items).toHaveLength(2);
    expect(queue.state.error).toContain('20');
  });

  it('restores prepared blobs and operation identifiers after reload without reuploading attached photos', async () => {
    const first = new PhotoQueue(1, 7);
    await first.load();
    await first.select([image()], 0);
    const selected = first.state.items[0];
    if (!selected) throw new Error('Missing upload');
    await first.save({ ...selected, prepared: image(), checksum: 'a'.repeat(32), fileId: 42, status: 'uploading' });

    const restored = new PhotoQueue(1, 7);
    await restored.load();

    expect(restored.state.items[0]).toMatchObject({
      id: selected.id,
      completionKey: selected.completionKey,
      fileId: 42,
      checksum: 'a'.repeat(32),
      status: 'waiting',
    });
    expect(restored.state.items[0]?.prepared).toBeInstanceOf(File);

    await restored.reconcile([42]);

    expect(restored.state.items).toHaveLength(0);
  });

  it('preserves its queue on expiry and clears memory and storage on user change or explicit logout', async () => {
    const queue = photoQueue(1, 7);
    await queue.load();
    await queue.select([image()], 0);
    const signal = uploadSession(1).signal;

    pauseUploadSession();

    expect(signal.aborted).toBe(true);
    expect(queue.state.items).toHaveLength(1);

    resumeUploadSession(1);
    await uploadSession(1).ready;

    expect(queue.state.items).toHaveLength(1);

    resumeUploadSession(2);
    await uploadSession(2).ready;

    expect(queue.state.items).toHaveLength(0);
    expect(storage.records.has('1:checklist:7')).toBe(false);

    const next = photoQueue(2, 7);
    await next.load();
    await next.select([image()], 0);
    pauseUploadSession(true);
    await uploadSession(2).ready;

    expect(next.state.items).toHaveLength(0);
    expect(storage.records.size).toBe(0);
  });

  it('keeps files in memory and warns when persistent storage fails', async () => {
    storage.isBroken = true;
    const queue = new PhotoQueue(1, 7);
    await queue.load();

    await queue.select([image()], 0);

    expect(queue.state.items).toHaveLength(1);
    expect(queue.state.storageFailed).toBe(true);
  });
});
