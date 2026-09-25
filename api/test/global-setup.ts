import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import type { TestProject } from 'vitest/node';

const migrationsFolder = fileURLToPath(new URL('../src/db/migrations', import.meta.url));

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

async function dropDatabase(administrationPool: Pool, databaseName: string): Promise<void> {
  await administrationPool.query(
    'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
    [databaseName],
  );
  await administrationPool.query(`drop database if exists "${databaseName}"`);
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const sourceDatabaseUrl = process.env.DATABASE_URL;
  if (!sourceDatabaseUrl) {
    throw new Error('Для интеграционных тестов требуется DATABASE_URL. Запустите PostgreSQL.');
  }

  const databaseName = `stageby_tests_${randomUUID().replaceAll('-', '')}`;
  const testDatabaseUrl = new URL(sourceDatabaseUrl);
  testDatabaseUrl.pathname = `/${databaseName}`;
  const administrationPool = new Pool({ connectionString: sourceDatabaseUrl });
  let testPool: Pool | undefined;

  try {
    await administrationPool.query(`create database "${databaseName}"`);
    testPool = new Pool({ connectionString: testDatabaseUrl.toString() });
    await migrate(drizzle({ client: testPool }), { migrationsFolder });
    await testPool.end();
    testPool = undefined;
  } catch (error) {
    await testPool?.end();
    await dropDatabase(administrationPool, databaseName);
    await administrationPool.end();
    throw error;
  }

  project.provide('databaseUrl', testDatabaseUrl.toString());

  return async () => {
    await dropDatabase(administrationPool, databaseName);
    await administrationPool.end();
  };
}
