import { describe, expect, it } from 'vitest';

import { createSessionToken, hashSessionToken } from './session-token.ts';

describe('Токены сессий', () => {
  it('создаёт случайный 256-битный токен и отдельный SHA-256-хеш', () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first.accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.tokenHash).toBe(hashSessionToken(first.accessToken));
    expect(first.tokenHash).not.toContain(first.accessToken);
    expect(second.accessToken).not.toBe(first.accessToken);
    expect(second.tokenHash).not.toBe(first.tokenHash);
  });
});
