import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import type { Environment } from '#app/config/env';

export async function registerSecurity(app: FastifyInstance, environment: Environment): Promise<void> {
  await app.register(fastifyCookie);

  await app.register(fastifyCors, {
    origin: environment.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  await app.register(fastifyRateLimit, {
    max: environment.RATE_LIMIT_MAX,
    timeWindow: environment.RATE_LIMIT_TIME_WINDOW,
  });

  const allowedOrigins = new Set(environment.CORS_ORIGIN.map((origin) => new URL(origin).origin));
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;

    if (!safeMethods.has(request.method) && origin !== undefined && !allowedOrigins.has(origin)) {
      return reply.status(403).send({
        error: 'Forbidden',
        code: 'forbidden',
        message: 'Источник запроса не разрешён.',
      });
    }
  });
}
