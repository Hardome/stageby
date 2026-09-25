import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import type { Environment } from '#app/config/env';
import { authModule } from '#app/modules/auth/index';
import { todoModule } from '#app/modules/todos/index';
import { userModule } from '#app/modules/users/index';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerDatabase } from '#app/plugins/database';
import { registerDocumentation } from '#app/plugins/documentation';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { registerSecurity } from '#app/plugins/security';

interface BuildAppOptions {
  environment: Environment;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.environment.NODE_ENV === 'development'
        ? {
            level: options.environment.LOG_LEVEL,
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                ignore: 'pid,hostname',
                translateTime: 'SYS:standard',
              },
            },
          }
        : { level: options.environment.LOG_LEVEL },
  }).withTypeProvider<ZodTypeProvider>();

  /* Валидация запросов и ответов через zod */
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  /* Плагины */
  registerErrorHandler(app, options.environment);
  await registerSecurity(app, options.environment);
  await registerDatabase(app, options.environment);
  await registerAuthentication(app);
  await registerDocumentation(app);

  /* Модули */
  await app.register(authModule, {
    NODE_ENV: options.environment.NODE_ENV,
    SESSION_TTL_HOURS: options.environment.SESSION_TTL_HOURS,
    LOGIN_RATE_LIMIT_MAX: options.environment.LOGIN_RATE_LIMIT_MAX,
    LOGIN_RATE_LIMIT_TIME_WINDOW: options.environment.LOGIN_RATE_LIMIT_TIME_WINDOW,
  });
  await app.register(userModule);
  await app.register(todoModule);

  return app;
}
