import { readFileSync } from 'node:fs';

import { Pool, type PoolClient } from 'pg';
import { describe, expect, inject, it } from 'vitest';

// cspell:ignore savepoint

const migration = readFileSync(new URL('../src/db/migrations/0005_adorable_exodus.sql', import.meta.url), 'utf8');

async function withLegacyFiles(check: (client: PoolClient) => Promise<void>) {
  const pool = new Pool({ connectionString: inject('databaseUrl') });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`CREATE TEMP TABLE files (
        "checksumSha256" varchar(64) NOT NULL,
        CONSTRAINT files_checksum_sha256_check CHECK ("checksumSha256" ~ '^[a-f0-9]{64}$')
      )`);
    await check(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
}

describe('file checksum migration', () => {
  it('changes an empty files table to MD5 with a format constraint', async () => {
    await withLegacyFiles(async (client) => {
      await client.query(migration);
      await client.query('INSERT INTO files VALUES ($1)', ['0'.repeat(32)]);
      expect((await client.query('SELECT * FROM files')).rows).toEqual([{ checksumMd5: '0'.repeat(32) }]);
      await expect(client.query('INSERT INTO files VALUES ($1)', ['g'.repeat(32)])).rejects.toThrow(
        'files_checksum_md5_check',
      );
    });
  });

  it('refuses a populated files table without changing its data', async () => {
    await withLegacyFiles(async (client) => {
      await client.query('INSERT INTO files VALUES ($1)', ['a'.repeat(64)]);
      await client.query('SAVEPOINT populated');

      await expect(client.query(migration)).rejects.toThrow('files must be empty');
      await client.query('ROLLBACK TO SAVEPOINT populated');

      expect((await client.query('SELECT * FROM files')).rows).toEqual([{ checksumSha256: 'a'.repeat(64) }]);
    });
  });
});
