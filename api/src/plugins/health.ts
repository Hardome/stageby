import { readFile } from 'node:fs/promises';

import type { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { z } from 'zod';

const manifestSchema = z.object({
  compatibilityVersion: z.number().int().positive(),
  migrations: z.array(z.object({ name: z.string(), timestamp: z.number().int(), hash: z.string() })),
});

export async function registerHealth(
  app: FastifyInstance,
  databaseUrl: string,
  schemaManifestPath = new URL('../../schema-manifest.json', import.meta.url),
): Promise<void> {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 3000,
    query_timeout: 3000,
    statement_timeout: 3000,
  });

  pool.on('error', () => {});

  app.addHook('onClose', () => pool.end());

  app.get('/health/live', async () => ({ status: 'alive' }));

  app.get('/health/ready', async (_request, reply) => {
    try {
      const manifest = manifestSchema.parse(JSON.parse(await readFile(schemaManifestPath, 'utf8')));
      const state = await pool.query<{ compatibility_version: number; migrating: boolean }>(
        'select compatibility_version, migrating from stageby_deployment.schema_state where id = 1',
      );
      const current = state.rows[0];

      if (!current || current.migrating || current.compatibility_version !== manifest.compatibilityVersion) {
        return reply.code(503).send({ status: 'not_ready' });
      }

      const journal = await pool.query<{ hash: string; created_at: string }>(
        'select hash, created_at from drizzle.__drizzle_migrations',
      );
      const applied = new Map(journal.rows.map((row) => [Number(row.created_at), row.hash]));

      if (manifest.migrations.some((migration) => applied.get(migration.timestamp) !== migration.hash)) {
        return reply.code(503).send({ status: 'not_ready' });
      }

      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'not_ready' });
    }
  });
}
