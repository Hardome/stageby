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
  let manifest: z.infer<typeof manifestSchema> | undefined;
  try {
    manifest = manifestSchema.parse(JSON.parse(await readFile(schemaManifestPath, 'utf8')));
  } catch {
    // Ошибка образа не должна мешать liveness или раскрывать содержимое файла.
  }
  let previousReason: string | undefined;
  const reportState = (reason: string) => {
    if (reason === previousReason) return;
    previousReason = reason;
    if (reason === 'ready') app.log.info({ reason }, 'Readiness state changed');
    else app.log.warn({ reason }, 'Readiness state changed');
  };

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
    const notReady = (reason: string) => {
      reportState(reason);
      return reply.code(503).send({ status: 'not_ready' });
    };
    if (!manifest) return notReady('manifest_unavailable_or_invalid');
    try {
      const state = await pool.query<{ compatibility_version: number; migrating: boolean }>(
        'select compatibility_version, migrating from stageby_deployment.schema_state where id = 1',
      );
      const current = state.rows[0];

      if (!current) return notReady('schema_state_missing');
      if (current.migrating) return notReady('migration_unfinished');
      if (current.compatibility_version !== manifest.compatibilityVersion) return notReady('schema_incompatible');

      const journal = await pool.query<{ hash: string; created_at: string }>(
        'select hash, created_at from drizzle.__drizzle_migrations',
      );
      const applied = new Map(journal.rows.map((row) => [Number(row.created_at), row.hash]));

      if (manifest.migrations.some((migration) => applied.get(migration.timestamp) !== migration.hash)) {
        return notReady('migration_hash_mismatch');
      }

      reportState('ready');
      return { status: 'ready' };
    } catch {
      return notReady('database_check_failed');
    }
  });
}
