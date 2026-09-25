import type { Session } from '@api/types';

const sessionKey = 'stageby.session';

type StoredSession = Pick<Session, 'accessToken' | 'expiresAt'>;

export function saveSession(session: Session) {
  const value: StoredSession = { accessToken: session.accessToken, expiresAt: session.expiresAt };

  sessionStorage.setItem(sessionKey, JSON.stringify(value));
}

export function getAccessToken(): string | undefined {
  const stored = sessionStorage.getItem(sessionKey);

  if (!stored) return;

  try {
    const session: unknown = JSON.parse(stored);
    if (
      typeof session === 'object' &&
      session !== null &&
      'accessToken' in session &&
      typeof session.accessToken === 'string' &&
      'expiresAt' in session &&
      typeof session.expiresAt === 'string' &&
      Date.parse(session.expiresAt) > Date.now()
    ) {
      return session.accessToken;
    }
  } catch {
    // A malformed or expired session needs a new login.
  }

  sessionStorage.removeItem(sessionKey);
}
