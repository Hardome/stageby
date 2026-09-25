import type { FastifyInstance, FastifyPluginAsync, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

import type { UserRow } from '#app/db/schema/users';
import type { AuthenticationContext } from '#app/modules/auth/authentication-context';
import { AuthenticationRepository } from '#app/modules/auth/authentication-repository';
import { AuthenticationService } from '#app/modules/auth/authentication-service';

type UserRole = UserRow['role'];
type AuthorizationHookFactory = (...roles: UserRole[]) => preHandlerAsyncHookHandler;

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthenticationContext | null;
  }

  interface FastifyInstance {
    authenticate: preHandlerAsyncHookHandler;
    requireRoles: AuthorizationHookFactory;
  }
}

const bearerHeaderPattern = /^Bearer ([A-Za-z0-9_-]{43})$/i;

function getBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  return bearerHeaderPattern.exec(authorizationHeader)?.[1] ?? null;
}

function sendUnauthorized(reply: FastifyReply) {
  return reply.header('WWW-Authenticate', 'Bearer').status(401).send({
    error: 'Unauthorized',
    code: 'unauthenticated',
    message: 'Не удалось подтвердить авторизацию.',
  });
}

function sendForbidden(reply: FastifyReply) {
  return reply.status(403).send({
    error: 'Forbidden',
    code: 'forbidden',
    message: 'Недостаточно прав для выполнения операции.',
  });
}

const authenticationPluginCallback: FastifyPluginAsync = async (app) => {
  const service = new AuthenticationService(new AuthenticationRepository(app.db));

  app.decorateRequest('auth', null);

  app.decorate('authenticate', async (request, reply) => {
    const accessToken = getBearerToken(request.headers.authorization);

    if (!accessToken) {
      return sendUnauthorized(reply);
    }

    const context = await service.authenticate(accessToken);

    if (!context) {
      return sendUnauthorized(reply);
    }

    request.auth = context;
  });

  app.decorate('requireRoles', (...roles) => {
    if (roles.length === 0) {
      throw new Error('Для проверки доступа требуется хотя бы одна роль');
    }

    const allowedRoles = new Set(roles);

    return async (request, reply) => {
      if (!request.auth) {
        return sendUnauthorized(reply);
      }

      if (!allowedRoles.has(request.auth.user.role)) {
        return sendForbidden(reply);
      }
    };
  });
};

const authenticationPlugin = fastifyPlugin(authenticationPluginCallback, {
  name: 'authentication',
  dependencies: ['database'],
});

export async function registerAuthentication(app: FastifyInstance): Promise<void> {
  await app.register(authenticationPlugin);
}
