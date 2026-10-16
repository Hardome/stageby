import { readUploadQueue, subscribeUploadSession, uploadSession, writeUploadQueue } from '@shared/lib/storage';

import type { PhotoQueueState, PhotoUpload } from '../model/types';
import { photoFailureMessage } from './photo-failure';
import { photoQueueSchema } from './photo-queue-schema';
import { photoError } from './prepare-photo';
import { uploadPhoto } from './upload-photo';

export class PhotoQueue {
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;
  private scope: string;
  state: PhotoQueueState = { items: [], loaded: false, storageFailed: false, error: '' };
  readonly ownerId: number;
  readonly itemId: number;
  processing = false;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };

  snapshot = () => this.state;

  constructor(ownerId: number, itemId: number) {
    this.ownerId = ownerId;
    this.itemId = itemId;
    this.scope = `checklist:${itemId}`;
  }

  private async restore() {
    const session = uploadSession(this.ownerId);

    try {
      await session.ready;
      if (!session.active) return;
      const stored = await readUploadQueue(this.ownerId, this.scope);
      session.signal.throwIfAborted();
      const parsed = photoQueueSchema.safeParse(stored ?? []);
      if (!parsed.success) throw new Error('Некорректная очередь фото.');

      this.update({
        items: parsed.data.map((item) => ({
          ...item,
          status: item.status === 'uploading' ? 'waiting' : item.status,
        })),
      });
    } catch {
      if (!session.signal.aborted) this.update({ storageFailed: true });
    } finally {
      if (!session.signal.aborted) this.update({ loaded: true });
    }
  }

  canProcess(signal: AbortSignal) {
    return !signal.aborted && !this.processing && this.state.items.some((item) => item.status === 'waiting');
  }

  update(values: Partial<PhotoQueueState>) {
    this.state = { ...this.state, ...values };
    for (const listener of this.listeners) listener();
  }

  async persist() {
    try {
      await writeUploadQueue(this.ownerId, this.scope, this.state.items);
    } catch {
      this.update({ storageFailed: true });
    }
  }

  async load() {
    if (this.state.loaded || !uploadSession(this.ownerId).active) return;
    this.loading ??= this.restore();
    await this.loading;
    if (this.state.loaded) return;

    this.loading = undefined;
    if (uploadSession(this.ownerId).active) await this.load();
  }

  async save(item: PhotoUpload) {
    this.update({ items: this.state.items.map((entry) => (entry.id === item.id ? item : entry)) });
    await this.persist();
  }

  async select(files: File[], activeCount: number) {
    const pendingCount = this.state.items.length;
    const available = Math.max(0, 20 - activeCount - pendingCount);
    const additions: PhotoUpload[] = [];
    const failures: string[] = [];

    for (const file of files) {
      const error = photoError(file);
      if (error) failures.push(`${file.name}: ${error}`);
      else if (additions.length >= available) failures.push(`${file.name}: не более 20 фото на пункт.`);
      else additions.push({ id: crypto.randomUUID(), file, completionKey: crypto.randomUUID(), status: 'waiting' });
    }

    this.update({ items: [...this.state.items, ...additions], error: failures.join(' ') });
    await this.persist();
  }

  async retry(id: string) {
    const item = this.state.items.find((entry) => entry.id === id);
    if (item && !item.attached && item.status !== 'uploading')
      await this.save({ ...item, status: 'waiting', error: undefined });
  }

  async remove(id: string) {
    this.update({ items: this.state.items.filter((item) => item.id !== id || item.status === 'uploading') });
    await this.persist();
  }

  async reconcile(fileIds: number[]) {
    const items = this.state.items.filter((item) => fileIds.every((id) => id !== item.fileId));
    if (items.length === this.state.items.length) return;

    this.update({ items });
    await this.persist();
  }

  async process(signal: AbortSignal, attached: () => Promise<void>, failed: (error: unknown) => void) {
    const next = this.state.items.find((item) => item.status === 'waiting');
    if (!next || this.processing || signal.aborted || !uploadSession(this.ownerId).active) return;
    this.processing = true;

    await this.save({ ...next, status: 'uploading' });

    try {
      await uploadPhoto(next, this.itemId, signal, (item) =>
        this.save({ ...item, status: item.attached ? 'uploaded' : 'uploading' }),
      );
      await attached();
    } catch (error) {
      if (!signal.aborted) failed(error);
      const item = this.state.items.find((entry) => entry.id === next.id);
      if (item)
        await this.save({
          ...item,
          status: signal.aborted ? 'waiting' : 'failed',
          error: signal.aborted ? undefined : photoFailureMessage(error),
        });
    } finally {
      this.processing = false;
      this.update({});
    }
  }
}

const queues = new Map<string, PhotoQueue>();
const lifecycle = { subscribed: false };

function clearForeignQueues() {
  for (const [key, queue] of queues) {
    if (uploadSession(queue.ownerId).ownerId === queue.ownerId) continue;

    queue.update({ items: [], loaded: true });
    queues.delete(key);
  }
}

export function photoQueue(ownerId: number, itemId: number) {
  if (!lifecycle.subscribed) {
    subscribeUploadSession(clearForeignQueues);
    lifecycle.subscribed = true;
  }

  const key = `${ownerId}:${itemId}`;
  let queue = queues.get(key);
  if (!queue) {
    queue = new PhotoQueue(ownerId, itemId);
    queues.set(key, queue);
  }

  return queue;
}
