import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { afterAll, beforeAll } from 'vitest';

import { registerDatabase } from '#app/plugins/database';

export function setupModuleTest(plugin: FastifyPluginAsync): () => FastifyInstance {
  let app: FastifyInstance | undefined;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('Для интеграционных тестов требуется DATABASE_URL. Запустите PostgreSQL.');
    }

    app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await registerDatabase(app, { DATABASE_URL: databaseUrl });
    await app.register(plugin);
    await app.ready();

    try {
      await app.db.execute(sql`select 1`);
    } catch (cause) {
      throw new Error('PostgreSQL недоступен для интеграционных тестов.', { cause });
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  return () => {
    if (!app) {
      throw new Error('Приложение для тестов модуля ещё не создано.');
    }

    return app;
  };
}
