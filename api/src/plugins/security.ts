import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import type { Environment } from '#app/config/env';

function parseOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.origin : null;
  } catch {
    return null;
  }
}

export async function registerSecurity(app: FastifyInstance, environment: Environment): Promise<void> {
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });
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
  if (environment.API_PUBLIC_ORIGIN) allowedOrigins.add(environment.API_PUBLIC_ORIGIN);
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  app.addHook('onRequest', async (request, reply) => {
    if (safeMethods.has(request.method)) return;
    const origin = request.headers.origin;
    let source: string | null = null;
    if (origin !== undefined) {
      if (parseOrigin(origin) === origin) source = origin;
    } else if (request.headers.referer) {
      source = parseOrigin(request.headers.referer);
    }

    if (source === null || !allowedOrigins.has(source)) {
      return reply.status(403).send({
        error: 'Forbidden',
        code: 'forbidden',
        message: 'Источник запроса не разрешён.',
      });
    }
  });
}
