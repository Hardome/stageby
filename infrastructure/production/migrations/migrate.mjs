import { readFileSync } from 'node:fs';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const client = new Client({ connectionString: databaseUrl });
const manifest = JSON.parse(readFileSync('./schema-manifest.json', 'utf8'));
const migrationLockId = 734921867;

try {
  await client.connect();

  // Блокировка привязана к этому соединению и освобождается при его закрытии.
  await client.query('select pg_advisory_lock($1)', [migrationLockId]);

  // Служебное состояние хранится отдельно от предметных таблиц приложения.
  await client.query('create schema if not exists stageby_deployment');
  await client.query(`
    create table if not exists stageby_deployment.schema_state (
      id integer primary key check (id = 1),
      compatibility_version integer not null,
      migrating boolean not null
    )
  `);

  const { rows } = await client.query('select * from stageby_deployment.schema_state where id = 1');
  const currentState = rows[0];

  if (currentState?.migrating) {
    throw new Error('Unfinished migration requires manual recovery');
  }

  if (currentState && currentState.compatibility_version > manifest.compatibilityVersion) {
    throw new Error('Migrator cannot downgrade schema compatibility');
  }

  const journal = await client.query("select to_regclass('drizzle.__drizzle_migrations') as name");

  // На пустой БД журнал ещё не создан; его создаст Drizzle при первом запуске.
  if (journal.rows[0].name) {
    const appliedMigrations = await client.query(`
      select hash, created_at
      from drizzle.__drizzle_migrations
      order by created_at
    `);

    for (const [index, appliedMigration] of appliedMigrations.rows.entries()) {
      const expectedMigration = manifest.migrations[index];
      const matchesManifest =
        expectedMigration &&
        expectedMigration.timestamp === Number(appliedMigration.created_at) &&
        expectedMigration.hash === appliedMigration.hash;

      if (!matchesManifest) {
        throw new Error('Database migration history differs from the image');
      }
    }
  }

  // Признак записывается вне транзакции Drizzle и остаётся после сбоя или обрыва.
  // Его нельзя снимать в finally: повторный запуск требует проверки состояния БД.
  await client.query(
    `
    insert into stageby_deployment.schema_state values (1, $1, true)
    on conflict (id) do update set migrating = true
  `,
    [manifest.compatibilityVersion],
  );
  await migrate(drizzle(client), { migrationsFolder: './migrations' });
  await client.query(
    `
    update stageby_deployment.schema_state
    set compatibility_version = $1, migrating = false
    where id = 1
  `,
    [manifest.compatibilityVersion],
  );

  console.log('Migrations completed');
} finally {
  await client.end();
}
