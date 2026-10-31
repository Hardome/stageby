import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

const administration = new Pool({ connectionString: process.env.DATABASE_URL });
const fixtureRoot = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url));
let directory: string;
let databaseName: string;
let databaseUrl: string;
let pool: Pool;
const children: ReturnType<typeof startMigrator>[] = [];

afterAll(() => administration.end());

function startMigrator(): {
  child: ReturnType<typeof spawn>;
  done: Promise<{ code: number | null; output: string }>;
} {
  const child = spawn(process.execPath, [join(directory, 'migrate.mjs')], {
    cwd: directory,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  const done = new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output }));
  });
  const running = { child, done };
  children.push(running);
  return running;
}

async function writeMigration(sql: string) {
  await writeFile(join(directory, 'migrations/0000_probe.sql'), sql);
  await writeFile(
    join(directory, 'migrations/meta/_journal.json'),
    JSON.stringify({
      version: '7',
      dialect: 'postgresql',
      entries: [{ idx: 0, version: '7', when: 1, tag: '0000_probe', breakpoints: true }],
    }),
  );
  await writeFile(
    join(directory, 'schema-manifest.json'),
    JSON.stringify({
      compatibilityVersion: 1,
      migrations: [{ name: '0000_probe', timestamp: 1, hash: createHash('sha256').update(sql).digest('hex') }],
    }),
  );
}

beforeEach(async () => {
  databaseName = `stageby_migrator_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DATABASE_URL ?? '');
  url.pathname = `/${databaseName}`;
  databaseUrl = url.toString();
  await administration.query(`create database "${databaseName}"`);
  pool = new Pool({ connectionString: databaseUrl });
  await mkdir(fixtureRoot, { recursive: true });
  directory = await mkdtemp(join(fixtureRoot, 'stageby-migrator-'));
  await mkdir(join(directory, 'migrations/meta'), { recursive: true });
  await copyFile(
    new URL('../../infrastructure/production/migrations/migrate.mjs', import.meta.url),
    join(directory, 'migrate.mjs'),
  );
});

afterEach(async () => {
  for (const running of children.splice(0)) {
    if (running.child.exitCode === null) running.child.kill('SIGKILL');
    await running.done;
  }
  await pool?.end();
  await administration.query('select pg_terminate_backend(pid) from pg_stat_activity where datname = $1', [
    databaseName,
  ]);
  await administration.query(`drop database if exists "${databaseName}"`);
  if (
    directory &&
    dirname(resolve(directory)) === resolve(fixtureRoot) &&
    basename(directory).startsWith('stageby-migrator-')
  ) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe('Production migrator recovery', () => {
  it('preserves the unfinished state after SQL failure and refuses retry', async () => {
    await writeMigration('create table probe (id integer);\n--> statement-breakpoint\nselect 1 / 0;');
    expect((await startMigrator().done).code).not.toBe(0);
    expect((await pool.query('select migrating from stageby_deployment.schema_state')).rows).toEqual([
      { migrating: true },
    ]);
    expect(
      (
        await pool.query(
          "select table_name from information_schema.tables where table_schema = 'public' and table_name = 'probe'",
        )
      ).rows,
    ).toEqual([]);
    expect((await startMigrator().done).output).toContain('Unfinished migration requires manual recovery');
  });

  it('preserves the unfinished state after process interruption', async () => {
    await writeMigration('select pg_sleep(2);');
    const running = startMigrator();
    await expect
      .poll(
        async () =>
          (
            await pool.query(
              "select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event = 'PgSleep'",
            )
          ).rows[0].count,
      )
      .toBe(1);
    running.child.kill('SIGKILL');
    await running.done;
    expect((await pool.query('select migrating from stageby_deployment.schema_state')).rows).toEqual([
      { migrating: true },
    ]);
    expect((await startMigrator().done).output).toContain('Unfinished migration requires manual recovery');
  });

  it('serializes concurrent migrators and applies SQL only once', async () => {
    await writeMigration('select pg_sleep(1);\n--> statement-breakpoint\ncreate table probe (id integer);');
    const first = startMigrator();
    const second = startMigrator();
    expect((await Promise.all([first.done, second.done])).map((result) => result.code)).toEqual([0, 0]);
    expect((await pool.query('select count(*)::int as count from drizzle.__drizzle_migrations')).rows[0].count).toBe(1);
    expect((await pool.query('select migrating from stageby_deployment.schema_state')).rows).toEqual([
      { migrating: false },
    ]);
  });

  it('rejects changed migration history before marking the schema unfinished', async () => {
    await writeMigration('create table probe (id integer);');
    expect((await startMigrator().done).code).toBe(0);
    await pool.query("update drizzle.__drizzle_migrations set hash = 'changed'");
    const result = await startMigrator().done;
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('Database migration history differs from the image');
    expect((await pool.query('select migrating from stageby_deployment.schema_state')).rows).toEqual([
      { migrating: false },
    ]);
  });
});
