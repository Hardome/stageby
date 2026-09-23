import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Pool } from 'pg';

declare module 'fastify' {
  interface FastifyInstance {
    db: NodePgDatabase;
  }
}

interface DatabasePluginOptions {
  databaseUrl: string;
}

const databasePluginCallback: FastifyPluginAsync<DatabasePluginOptions> = async (app, options) => {
  const pool = new Pool({ connectionString: options.databaseUrl });
  const database = drizzle({ client: pool });

  app.decorate('db', database);
  app.addHook('onClose', async () => {
    await pool.end();
  });
};

export const databasePlugin = fastifyPlugin(databasePluginCallback, {
  name: 'database',
});
