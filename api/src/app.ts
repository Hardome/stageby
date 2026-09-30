import type { Writable } from 'node:stream';

import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import type { Environment } from '#app/config/env';
import { authModule } from '#app/modules/auth/index';
import { fileModule } from '#app/modules/files/index';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { userModule } from '#app/modules/users/index';
import { workPaymentModule } from '#app/modules/work-payments/index';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerDatabase } from '#app/plugins/database';
import { registerDocumentation } from '#app/plugins/documentation';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { registerSecurity } from '#app/plugins/security';
import { S3FileStorage } from '#app/storage/s3-file-storage';

interface BuildAppOptions {
  environment: Environment;
  loggerStream?: Writable;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const loggerSecurity = {
    level: options.environment.LOG_LEVEL,
    redact: {
      paths: ['req.headers.cookie', 'req.headers.authorization', 'req.body.password', 'res.headers["set-cookie"]'],
      censor: '[REDACTED]',
    },
  };
  const app = Fastify({
    logger:
      options.environment.NODE_ENV === 'development'
        ? {
            ...loggerSecurity,
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                ignore: 'pid,hostname',
                translateTime: 'SYS:standard',
              },
            },
          }
        : { ...loggerSecurity, ...(options.loggerStream ? { stream: options.loggerStream } : {}) },
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
  const fileStorage = new S3FileStorage(options.environment);
  if (options.environment.S3_CREATE_BUCKET) await fileStorage.ensureBucket();
  await app.register(fileModule, {
    storage: fileStorage,
    signedUrlTtlSeconds: options.environment.S3_SIGNED_URL_TTL_SECONDS,
    cleanupIntervalSeconds: options.environment.FILE_CLEANUP_INTERVAL_SECONDS,
  });
  await app.register(projectModule);
  await app.register(stageModule);
  await app.register(workPaymentModule);

  return app;
}
