import { clearSessionDrafts } from './session-drafts';

const key = 'stageby:session-user';

export function sessionOwner(): number | undefined {
  try {
    const value = Number(sessionStorage.getItem(key));

    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  } catch {
    return;
  }
}

export function setSessionOwner(userId?: number): void {
  try {
    if (userId === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(userId));
  } catch {
    // Недоступное хранилище не должно мешать входу и выходу.
  }
}

export function reconcileSessionOwner(userId: number): void {
  if (sessionOwner() !== userId) clearSessionDrafts();
  setSessionOwner(userId);
}
