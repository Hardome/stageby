import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { expect, it } from 'vitest';

import { FirstManagerRepository } from '#app/commands/first-manager';
import { auditChanges, auditEvents } from '#app/db/schema/audit';
import * as schema from '#app/db/schema/index';

const migrationsFolder = fileURLToPath(new URL('../src/db/migrations', import.meta.url));

async function previousMigrations(): Promise<string> {
  const folder = await mkdtemp(`${tmpdir()}/stageby-before-audit-`);
  await mkdir(`${folder}/meta`);
  const journal = JSON.parse(await readFile(`${migrationsFolder}/meta/_journal.json`, 'utf8')) as {
    entries: Array<{ idx: number; tag: string }>;
  };
  journal.entries = journal.entries.filter((entry) => entry.idx < 12);
  await Promise.all(
    journal.entries.map((entry) => copyFile(`${migrationsFolder}/${entry.tag}.sql`, `${folder}/${entry.tag}.sql`)),
  );
  await writeFile(`${folder}/meta/_journal.json`, JSON.stringify(journal));
  return folder;
}

it('preserves existing data without inventing history and audits the first manager command once', {
  timeout: 30_000,
}, async () => {
  const databaseUrl = process.env.DATABASE_URL!;
  const databaseName = `stageby_audit_migration_${randomUUID().replaceAll('-', '')}`;
  const temporaryUrl = new URL(databaseUrl);
  temporaryUrl.pathname = `/${databaseName}`;
  const administrationPool = new Pool({ connectionString: databaseUrl });
  const folder = await previousMigrations();
  let temporaryPool: Pool | undefined;
  let databaseCreated = false;
  try {
    await administrationPool.query(`create database "${databaseName}"`);
    databaseCreated = true;
    temporaryPool = new Pool({ connectionString: temporaryUrl.toString() });
    const database = drizzle({ client: temporaryPool, schema });
    await migrate(database, { migrationsFolder: folder });
    // The fixture predates new service columns; use the schema that existed at that revision.
    const {
      rows: [project],
    } = await temporaryPool.query<{ id: number }>(`
      insert into projects ("ownerName", address, latitude, longitude, "plannedStartDate", "plannedEndDate")
      values ('Existing client', 'Existing address', 56.84, 60.61, '2026-01-01', '2026-12-31') returning *
    `);
    const [stage] = await database
      .insert(schema.stages)
      .values({
        projectId: project!.id,
        stageTypeCode: 'foundation',
        position: 1,
        plannedStartDate: '2026-01-01',
        plannedEndDate: '2026-01-31',
      })
      .returning();
    await migrate(database, { migrationsFolder });
    const { rows: currentProjects } = await temporaryPool.query('select * from projects');
    expect(currentProjects).toEqual([{ ...project, creationIdempotencyKey: null, creationFingerprint: null }]);
    expect(await database.select().from(schema.stages)).toEqual([stage]);
    expect(await database.select().from(auditEvents)).toEqual([]);
    expect(await database.select().from(auditChanges)).toEqual([]);
    const repository = new FirstManagerRepository(database);
    const input = { login: 'first.manager', fullName: 'First manager', passwordHash: 'secret-hash' };
    const results = await Promise.all([repository.createIfEmpty(input), repository.createIfEmpty(input)]);
    expect(results.map((result) => result.status).sort()).toEqual(['already_initialized', 'created']);
    const events = await database.select().from(auditEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      operation: 'createFirstManager',
      source: 'command',
      actorUserId: null,
      actorSnapshot: null,
    });
    const changes = await database.select().from(auditChanges);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      entityType: 'users',
      action: 'create',
      before: null,
      after: { login: input.login, fullName: input.fullName, role: 'manager' },
    });
    expect(JSON.stringify(changes)).not.toContain(input.passwordHash);
    await migrate(database, { migrationsFolder });
    expect(await database.select().from(auditEvents)).toEqual(events);
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
    await rm(folder, { recursive: true, force: true });
  }
});
