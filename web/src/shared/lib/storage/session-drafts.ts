const prefix = 'stageby:draft:';

export function readSessionDraft(key: string): unknown {
  try {
    const value = sessionStorage.getItem(prefix + key);

    return value ? (JSON.parse(value) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

export function writeSessionDraft(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(prefix + key, JSON.stringify(value));
  } catch {
    // A disabled or full storage must not prevent editing the form.
  }
}

export function removeSessionDraft(key: string): void {
  try {
    sessionStorage.removeItem(prefix + key);
  } catch {
    // Storage is optional.
  }
}

export function clearSessionDrafts(): void {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
    }
  } catch {
    // Signing out must work even when storage is unavailable.
  }
}
