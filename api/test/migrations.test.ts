import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

const migrationsFolder = fileURLToPath(new URL('../src/db/migrations', import.meta.url));

const expectedTables = [
  'acceptance_items',
  'acceptances',
  'checklist_items',
  'checklists',
  'projects',
  'sessions',
  'stage_predecessors',
  'stages',
  'todos',
  'users',
];

const expectedIndexes = [
  'acceptance_items_checklist_item_idx',
  'acceptances_decided_by_user_idx',
  'acceptances_stage_decided_at_idx',
  'checklist_items_checklist_position_unique',
  'checklist_items_completed_by_user_idx',
  'checklists_stage_id_unique',
  'projects_archived_created_at_idx',
  'sessions_expires_at_idx',
  'sessions_token_hash_unique',
  'sessions_user_id_idx',
  'stage_predecessors_predecessor_idx',
  'stages_assignee_status_idx',
  'stages_inspector_status_idx',
  'stages_project_position_unique',
  'stages_project_type_unique',
  'stages_status_idx',
  'users_login_unique',
  'users_role_active_idx',
];

const expectedForeignKeys = [
  'acceptance_items_acceptanceId_acceptances_id_fk',
  'acceptance_items_checklistItemId_checklist_items_id_fk',
  'acceptances_decidedByUserId_users_id_fk',
  'acceptances_stageId_stages_id_fk',
  'checklist_items_checklistId_checklists_id_fk',
  'checklist_items_completedByUserId_users_id_fk',
  'checklists_stageId_stages_id_fk',
  'sessions_userId_users_id_fk',
  'stage_predecessors_predecessor_fk',
  'stage_predecessors_stage_fk',
  'stages_assigneeId_users_id_fk',
  'stages_inspectorId_users_id_fk',
  'stages_projectId_projects_id_fk',
];

describe('миграции БД', () => {
  it('применяются на пустой БД, повторяются без изменений и создают ограничения с индексами', {
    timeout: 30_000,
  }, async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('Для проверки миграций требуется DATABASE_URL');
    }

    const databaseName = `stageby_migrations_${randomUUID().replaceAll('-', '')}`;
    const temporaryUrl = new URL(databaseUrl);
    temporaryUrl.pathname = `/${databaseName}`;
    const administrationPool = new Pool({ connectionString: databaseUrl });
    let temporaryPool: Pool | undefined;
    let databaseCreated = false;

    try {
      await administrationPool.query(`create database "${databaseName}"`);
      databaseCreated = true;
      temporaryPool = new Pool({ connectionString: temporaryUrl.toString() });
      const database = drizzle({ client: temporaryPool });

      await migrate(database, { migrationsFolder });
      const firstJournal = await temporaryPool.query<{ count: string }>(
        'select count(*)::text as count from drizzle.__drizzle_migrations',
      );
      const firstTables = await temporaryPool.query<{ name: string }>(
        "select tablename as name from pg_tables where schemaname = 'public' order by tablename",
      );

      await migrate(database, { migrationsFolder });
      const secondJournal = await temporaryPool.query<{ count: string }>(
        'select count(*)::text as count from drizzle.__drizzle_migrations',
      );
      const secondTables = await temporaryPool.query<{ name: string }>(
        "select tablename as name from pg_tables where schemaname = 'public' order by tablename",
      );
      const indexes = await temporaryPool.query<{ name: string }>(
        "select indexname as name from pg_indexes where schemaname = 'public'",
      );
      const foreignKeys = await temporaryPool.query<{ name: string }>(
        "select conname as name from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace",
      );
      const checkConstraints = await temporaryPool.query<{ count: string }>(
        "select count(*)::text as count from pg_constraint where contype = 'c' and connamespace = 'public'::regnamespace",
      );
      const enumTypes = await temporaryPool.query<{ name: string }>(
        "select typname as name from pg_type where typtype = 'e' and typnamespace = 'public'::regnamespace order by typname",
      );

      expect(firstJournal.rows[0]?.count).toBe('4');
      expect(secondJournal.rows).toEqual(firstJournal.rows);
      expect(firstTables.rows.map((row) => row.name)).toEqual(expectedTables);
      expect(secondTables.rows).toEqual(firstTables.rows);
      expect(indexes.rows.map((row) => row.name)).toEqual(expect.arrayContaining(expectedIndexes));
      expect(foreignKeys.rows.map((row) => row.name)).toEqual(expect.arrayContaining(expectedForeignKeys));
      expect(checkConstraints.rows[0]?.count).toBe('33');
      expect(enumTypes.rows.map((row) => row.name)).toEqual([
        'acceptance_decision',
        'stage_status',
        'stage_type',
        'user_role',
      ]);
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
    }
  });
});
