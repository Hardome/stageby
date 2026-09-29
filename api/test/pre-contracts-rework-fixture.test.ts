import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

// cspell:ignore annihilus
const migrationFiles = [
  '0000_useful_annihilus.sql',
  '0001_thin_iron_man.sql',
  '0002_harsh_maelstrom.sql',
  '0003_tan_shiver_man.sql',
];
const migrationsFolder = fileURLToPath(new URL('../src/db/migrations', import.meta.url));
const fixturePath = fileURLToPath(new URL('./fixtures/pre-contracts-rework.sql', import.meta.url));

async function createFrozenMigrationsFolder(): Promise<string> {
  const frozenFolder = await mkdtemp(`${tmpdir()}/stageby-pre-contracts-rework-`);
  await mkdir(`${frozenFolder}/meta`);

  await Promise.all(
    migrationFiles.map((fileName) => copyFile(`${migrationsFolder}/${fileName}`, `${frozenFolder}/${fileName}`)),
  );

  const journalPath = `${migrationsFolder}/meta/_journal.json`;
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as {
    entries: Array<{ tag: string }>;
  };
  journal.entries = journal.entries.filter((entry) => migrationFiles.includes(`${entry.tag}.sql`));
  await writeFile(`${frozenFolder}/meta/${basename(journalPath)}`, `${JSON.stringify(journal, null, 2)}\n`);

  return frozenFolder;
}

describe('набор данных до переработки контрактов', () => {
  it('загружается поверх миграций 0000–0003 и покрывает прежние enum', { timeout: 30_000 }, async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('Для проверки fixture требуется DATABASE_URL');
    }

    const databaseName = `stageby_legacy_fixture_${randomUUID().replaceAll('-', '')}`;
    const temporaryUrl = new URL(databaseUrl);
    temporaryUrl.pathname = `/${databaseName}`;
    const administrationPool = new Pool({ connectionString: databaseUrl });
    const frozenMigrationsFolder = await createFrozenMigrationsFolder();
    let temporaryPool: Pool | undefined;
    let databaseCreated = false;

    try {
      await administrationPool.query(`create database "${databaseName}"`);
      databaseCreated = true;
      temporaryPool = new Pool({ connectionString: temporaryUrl.toString() });
      await migrate(drizzle({ client: temporaryPool }), { migrationsFolder: frozenMigrationsFolder });
      await temporaryPool.query(await readFile(fixturePath, 'utf8'));

      const tables = await temporaryPool.query<{ table_name: string; rows: string }>(`
        select 'users' as table_name, count(*)::text as rows from users
        union all select 'sessions', count(*)::text from sessions
        union all select 'todos', count(*)::text from todos
        union all select 'projects', count(*)::text from projects
        union all select 'stages', count(*)::text from stages
        union all select 'stage_predecessors', count(*)::text from stage_predecessors
        union all select 'checklists', count(*)::text from checklists
        union all select 'checklist_items', count(*)::text from checklist_items
        union all select 'acceptances', count(*)::text from acceptances
        union all select 'acceptance_items', count(*)::text from acceptance_items
      `);
      const enumCoverage = await temporaryPool.query<{
        decisions: string[];
        roles: string[];
        statuses: string[];
        types: string[];
      }>(`
        select
          (select array_agg(distinct role::text order by role::text) from users) as roles,
          (select array_agg(distinct type::text order by type::text) from stages) as types,
          (select array_agg(distinct status::text order by status::text) from stages) as statuses,
          (select array_agg(distinct decision::text order by decision::text) from acceptances) as decisions
      `);

      expect(Object.fromEntries(tables.rows.map((row) => [row.table_name, Number(row.rows)]))).toEqual({
        users: 4,
        sessions: 1,
        todos: 1,
        projects: 2,
        stages: 8,
        stage_predecessors: 7,
        checklists: 2,
        checklist_items: 4,
        acceptances: 2,
        acceptance_items: 3,
      });
      expect(enumCoverage.rows[0]).toEqual({
        roles: ['estimator', 'foreman', 'inspector', 'manager'],
        types: ['electrical', 'facade', 'foundation', 'heating', 'plaster', 'roof', 'walls', 'windows'],
        statuses: ['acceptance', 'assigned', 'completed', 'created', 'in_progress', 'started', 'supplied'],
        decisions: ['accepted', 'rejected'],
      });
    } finally {
      await temporaryPool?.end();

      if (databaseCreated) {
        await administrationPool.query(
          'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
          [databaseName],
        );
        await administrationPool.query(`drop database "${databaseName}"`);
      }

      await administrationPool.end();
      await rm(frozenMigrationsFolder, { recursive: true, force: true });
    }
  });
});
