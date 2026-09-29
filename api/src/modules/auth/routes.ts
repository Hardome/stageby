import { normalizeIP } from '@fastify/rate-limit';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { RouteHandlers } from '#app/generated/fastify.gen';
import type { ApiError } from '#app/generated/types.gen';
import { zApiError, zGetCurrentUserResponse, zLoginBody, zLoginResponse } from '#app/generated/zod.gen';
import type { LoginService } from '#app/modules/auth/login-service';
import {
  expiredSessionCookieOptions,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '#app/modules/auth/session-cookie';
import type { SessionRepository } from '#app/modules/auth/session-repository';
import { toUser } from '#app/modules/users/mapper';

interface AuthRouteOptions {
  loginRateLimitMax: number;
  loginRateLimitTimeWindow: string;
  secureCookie: boolean;
}

const unauthorizedResponse = {
  error: 'Unauthorized',
  code: 'unauthenticated',
  message: 'Не удалось подтвердить авторизацию.',
} satisfies ApiError;

function normalizedLoginKey(request: FastifyRequest): string {
  const body = request.body;
  const login = typeof body === 'object' && body !== null && 'login' in body ? body.login : '';
  return `auth-login:${typeof login === 'string' ? login.trim().toLowerCase() : ''}`;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  loginService: LoginService,
  sessions: SessionRepository,
  options: AuthRouteOptions,
): void {
  const login: RouteHandlers['login'] = async (request, reply) => {
    const result = await loginService.login(request.body.login, request.body.password);

    if (!result) {
      return reply.status(401).send(unauthorizedResponse);
    }

    return reply
      .header('Cache-Control', 'no-store')
      .setCookie(
        SESSION_COOKIE_NAME,
        result.issuedSession.accessToken,
        sessionCookieOptions(result.issuedSession.expiresAt, options.secureCookie),
      )
      .status(200)
      .send({
        expiresAt: result.issuedSession.expiresAt.toISOString(),
        user: toUser(result.user),
      });
  };

  const logout: RouteHandlers['logout'] = async (request, reply) => {
    const sessionId = request.auth?.session.id;

    if (sessionId === undefined) {
      return reply.status(401).send(unauthorizedResponse);
    }

    await sessions.revokeById(sessionId);
    return reply.clearCookie(SESSION_COOKIE_NAME, expiredSessionCookieOptions(options.secureCookie)).status(204).send();
  };

  const getCurrentUser: RouteHandlers['getCurrentUser'] = async (request, reply) => {
    if (!request.auth) {
      return reply.status(401).send(unauthorizedResponse);
    }

    return reply.status(200).send(toUser(request.auth.user));
  };

  const rateLimitBase = {
    max: options.loginRateLimitMax,
    timeWindow: options.loginRateLimitTimeWindow,
  };
  const checkIpRateLimit = app.createRateLimit({
    ...rateLimitBase,
    keyGenerator: (request) => `auth-login-ip:${normalizeIP(request.ip)}`,
  });
  const checkLoginRateLimit = app.createRateLimit({
    ...rateLimitBase,
    keyGenerator: normalizedLoginKey,
  });
  const enforceLoginRateLimit = async (request: FastifyRequest, reply: Parameters<RouteHandlers['login']>[1]) => {
    for (const checkRateLimit of [checkIpRateLimit, checkLoginRateLimit]) {
      const result = await checkRateLimit(request);

      if (!result.isAllowed && (result.isExceeded || result.isBanned)) {
        return reply.header('Retry-After', result.ttlInSeconds).status(429).send({
          error: 'Too Many Requests',
          code: 'rate_limited',
          message: 'Превышен лимит запросов. Повторите попытку позже.',
        });
      }
    }
  };

  app.post('/auth/login', {
    preHandler: enforceLoginRateLimit,
    schema: {
      body: zLoginBody,
      response: { 200: zLoginResponse, 400: zApiError, 401: zApiError, 429: zApiError },
    },
    handler: login,
  });

  app.post('/auth/logout', {
    preHandler: app.authenticate,
    schema: { response: { 401: zApiError } },
    handler: logout,
  });

  app.get('/auth/me', {
    preHandler: app.authenticate,
    schema: { response: { 200: zGetCurrentUserResponse, 401: zApiError } },
    handler: getCurrentUser,
  });
}
