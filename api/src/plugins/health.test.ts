import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import Fastify from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { registerHealth } from '#app/plugins/health';

const app = Fastify();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let directory: string;
let manifestPath: URL;
let requiredTimestamp: string;
let requiredHash: string;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'stageby-health-'));
  const journal = await pool.query<{ hash: string; created_at: string }>(
    'select hash, created_at from drizzle.__drizzle_migrations order by created_at limit 1',
  );
  const first = journal.rows[0];
  if (!first) throw new Error('Test database has no migrations');
  requiredTimestamp = first.created_at;
  requiredHash = first.hash;
  manifestPath = pathToFileURL(join(directory, 'schema-manifest.json'));
  await writeFile(
    manifestPath,
    JSON.stringify({
      compatibilityVersion: 1,
      migrations: [{ name: 'required', timestamp: Number(requiredTimestamp), hash: requiredHash }],
    }),
  );
  await pool.query('create schema stageby_deployment');
  await pool.query(`create table stageby_deployment.schema_state (
    id integer primary key, compatibility_version integer not null, migrating boolean not null
  )`);
  await pool.query('insert into stageby_deployment.schema_state values (1, 1, false)');
  await registerHealth(app, process.env.DATABASE_URL ?? '', manifestPath);
});

afterAll(async () => {
  await app.close();
  await pool.query('drop schema if exists stageby_deployment cascade');
  await pool.end();
  if (directory) {
    const target = resolve(directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('stageby-health-')) {
      throw new Error('Unexpected health fixture path');
    }
    await rm(target, { recursive: true, force: true });
  }
});

describe('Внутренние проверки состояния', () => {
  it('принимает дополнительные завершённые миграции при совместимой схеме', async () => {
    expect((await app.inject('/health/ready')).statusCode).toBe(200);
  });

  it('отклоняет несовместимую схему и незавершённую миграцию', async () => {
    for (const [version, migrating] of [
      [2, false],
      [1, true],
    ] as const) {
      await pool.query('update stageby_deployment.schema_state set compatibility_version = $1, migrating = $2', [
        version,
        migrating,
      ]);
      expect((await app.inject('/health/ready')).statusCode).toBe(503);
      expect((await app.inject('/health/live')).statusCode).toBe(200);
    }
    await pool.query('update stageby_deployment.schema_state set compatibility_version = 1, migrating = false');
  });

  it('отклоняет изменённую контрольную сумму обязательной миграции', async () => {
    try {
      await pool.query('update drizzle.__drizzle_migrations set hash = $1 where created_at = $2', [
        'changed',
        requiredTimestamp,
      ]);
      expect((await app.inject('/health/ready')).statusCode).toBe(503);
    } finally {
      await pool.query('update drizzle.__drizzle_migrations set hash = $1 where created_at = $2', [
        requiredHash,
        requiredTimestamp,
      ]);
    }
  });

  it('сохраняет liveness при недоступной БД и не раскрывает ошибку подключения', async () => {
    const unavailable = Fastify();
    await registerHealth(unavailable, 'postgresql://test:test@127.0.0.1:1/test', manifestPath);
    try {
      expect((await unavailable.inject('/health/live')).statusCode).toBe(200);
      const response = await unavailable.inject('/health/ready');
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'not_ready' });
    } finally {
      await unavailable.close();
    }
  });
});
