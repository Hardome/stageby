import type { CookieSerializeOptions } from '@fastify/cookie';

export const SESSION_COOKIE_NAME = 'stageby_session';

export function sessionCookieOptions(expiresAt: Date, secure: boolean): CookieSerializeOptions {
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    expires: expiresAt,
  };
}

export function expiredSessionCookieOptions(secure: boolean): CookieSerializeOptions {
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
  };
}
