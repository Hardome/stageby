import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Pool } from 'pg';

import * as databaseSchema from '../db/schema.js';

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
  const database = drizzle({ client: pool, schema: databaseSchema });

  app.decorate('db', database);
  app.addHook('onClose', async () => {
    await pool.end();
  });
};

export const databasePlugin = fastifyPlugin(databasePluginCallback, {
  name: 'database',
});
