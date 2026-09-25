import { createHash, randomBytes } from 'node:crypto';

const SESSION_TOKEN_BYTES = 32;

export interface SessionToken {
  accessToken: string;
  tokenHash: string;
}

export function hashSessionToken(accessToken: string): string {
  return createHash('sha256').update(accessToken, 'utf8').digest('hex');
}

export function createSessionToken(): SessionToken {
  const accessToken = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
  return { accessToken, tokenHash: hashSessionToken(accessToken) };
}
