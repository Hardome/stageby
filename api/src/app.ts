import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';

import type { Environment } from './config/env.js';
import { registerErrorHandler } from './error-handler.js';
import { databasePlugin } from './plugins/database.js';
import { registerDocumentation } from './plugins/documentation.js';
import { registerSecurity } from './plugins/security.js';
import { DrizzleTodoRepository } from './todos/drizzle-todo-repository.js';
import { registerTodoRoutes } from './todos/routes.js';
import type { TodoRepository } from './todos/todo-repository.js';

interface BuildAppOptions {
  environment: Environment;
  todoRepository?: TodoRepository;
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

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app, options.environment);

  await registerSecurity(app, options.environment);
  await registerDocumentation(app);
  await app.register(databasePlugin, {
    databaseUrl: options.environment.DATABASE_URL,
  });

  registerTodoRoutes(app, options.todoRepository ?? new DrizzleTodoRepository(app.db));

  return app;
}
