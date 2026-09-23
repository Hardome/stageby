import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import type { Environment } from '#app/config/env';

export async function registerSecurity(app: FastifyInstance, environment: Environment): Promise<void> {
  await app.register(fastifyCors, {
    origin: environment.CORS_ORIGIN,
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  await app.register(fastifyRateLimit, {
    max: environment.RATE_LIMIT_MAX,
    timeWindow: environment.RATE_LIMIT_TIME_WINDOW,
  });
}
