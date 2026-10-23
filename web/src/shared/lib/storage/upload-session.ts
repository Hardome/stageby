import { clearUploadStorage, reconcileUploadStorage } from './upload-storage';

const session = {
  ownerId: undefined as number | undefined,
  controller: new AbortController(),
  ready: Promise.resolve() as Promise<unknown>,
};
const listeners = new Set<() => void>();

export function uploadSession(userId: number) {
  return {
    signal: session.controller.signal,
    ownerId: session.ownerId,
    active: session.ownerId === userId && !session.controller.signal.aborted,
    ready: session.ready,
  };
}

export function subscribeUploadSession(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function resumeUploadSession(userId: number) {
  if (session.ownerId === userId && !session.controller.signal.aborted) return;

  session.controller.abort();
  session.controller = new AbortController();
  session.ownerId = userId;
  session.ready = reconcileUploadStorage(userId);
  // Ошибка хранилища обрабатывается очередью; вход остаётся доступным.
  void session.ready.catch(() => {});
  for (const listener of listeners) listener();
}

export function pauseUploadSession(shouldClear = false) {
  session.controller.abort();

  if (shouldClear) {
    session.ownerId = undefined;
    session.ready = clearUploadStorage();
    void session.ready.catch(() => {});
  }

  for (const listener of listeners) listener();
}
