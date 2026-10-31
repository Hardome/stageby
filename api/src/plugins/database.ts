import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Pool } from 'pg';

import type { Environment } from '#app/config/env';
import * as databaseSchema from '#app/db/schema/index';

declare module 'fastify' {
  interface FastifyInstance {
    db: NodePgDatabase<typeof databaseSchema>;
  }
}

interface DatabasePluginOptions {
  databaseUrl: string;
}

const databasePluginCallback: FastifyPluginAsync<DatabasePluginOptions> = async (app, options) => {
  const pool = new Pool({ connectionString: options.databaseUrl });

  pool.on('error', () => {
    app.log.error('Потеряно неактивное соединение с БД');
  });

  const database = drizzle({ client: pool, schema: databaseSchema });

  app.decorate('db', database);
  app.addHook('onClose', async () => {
    await pool.end();
  });
};

const databasePlugin = fastifyPlugin(databasePluginCallback, {
  name: 'database',
});

export async function registerDatabase(
  app: FastifyInstance,
  environment: Pick<Environment, 'DATABASE_URL'>,
): Promise<void> {
  await app.register(databasePlugin, { databaseUrl: environment.DATABASE_URL });
}
