import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

// cspell:ignore tgname tgisinternal enumlabel enumtypid enumsortorder

const migrationsFolder = fileURLToPath(new URL('../src/db/migrations', import.meta.url));

const expectedTables = [
  'acceptance_items',
  'acceptances',
  'audit_changes',
  'audit_events',
  'checklist_item_photos',
  'checklist_items',
  'checklist_template_items',
  'checklist_templates',
  'checklists',
  'files',
  'material_invoices',
  'material_shortages',
  'project_documents',
  'projects',
  'sessions',
  'stage_predecessors',
  'stage_types',
  'stages',
  'users',
  'work_payments',
];

const expectedIndexes = [
  'audit_events_occurred_at_idx',
  'audit_changes_event_idx',
  'audit_changes_entity_idx',
  'audit_changes_project_idx',
  'audit_changes_stage_idx',
  'acceptance_items_checklist_item_idx',
  'acceptances_decided_by_user_idx',
  'acceptances_stage_decided_at_idx',
  'checklist_item_photos_file_unique',
  'checklist_item_photos_active_position_unique',
  'checklist_item_photos_item_idx',
  'checklist_items_checklist_position_unique',
  'checklist_items_completed_by_user_idx',
  'checklist_template_items_template_position_unique',
  'checklist_templates_active_stage_type_unique',
  'checklists_stage_id_unique',
  'material_invoices_stage_idx',
  'material_invoices_stage_paid_delivered_idx',
  'material_invoices_file_unique',
  'material_shortages_invoice_idx',
  'material_shortages_open_idx',
  'files_completion_idempotency_key_unique',
  'files_expiration_cleanup_idx',
  'files_pending_cleanup_idx',
  'files_storage_key_unique',
  'project_documents_file_unique',
  'project_documents_project_position_unique',
  'projects_archived_created_at_idx',
  'projects_creation_idempotency_key_unique',
  'sessions_expires_at_idx',
  'sessions_token_hash_unique',
  'sessions_user_id_idx',
  'stage_predecessors_predecessor_idx',
  'stage_types_position_unique',
  'stages_assignee_status_idx',
  'stages_project_position_unique',
  'stages_project_type_unique',
  'stages_status_idx',
  'users_login_unique',
  'users_role_active_idx',
  'work_payments_stage_paid_at_idx',
];

const expectedForeignKeys = [
  'work_payments_recipientId_users_id_fk',
  'audit_changes_eventId_audit_events_id_fk',
  'acceptance_items_acceptanceId_acceptances_id_fk',
  'acceptance_items_checklistItemId_checklist_items_id_fk',
  'acceptances_decidedByUserId_users_id_fk',
  'acceptances_stageId_stages_id_fk',
  'checklist_item_photos_checklistItemId_checklist_items_id_fk',
  'checklist_item_photos_fileId_files_id_fk',
  'checklist_items_checklistId_checklists_id_fk',
  'checklist_items_completedByUserId_users_id_fk',
  'checklist_template_items_checklistTemplateId_checklist_template',
  'checklist_templates_stageTypeCode_stage_types_code_fk',
  'checklists_stageId_stages_id_fk',
  'material_invoices_stageId_stages_id_fk',
  'material_invoices_fileId_files_id_fk',
  'material_invoices_paidByUserId_users_id_fk',
  'material_invoices_deliveredByUserId_users_id_fk',
  'material_shortages_invoiceId_material_invoices_id_fk',
  'material_shortages_reportedByUserId_users_id_fk',
  'material_shortages_resolvedByUserId_users_id_fk',
  'files_uploadedByUserId_users_id_fk',
  'project_documents_fileId_files_id_fk',
  'project_documents_projectId_projects_id_fk',
  'sessions_userId_users_id_fk',
  'stage_predecessors_predecessor_fk',
  'stage_predecessors_stage_fk',
  'stages_assigneeId_users_id_fk',
  'stages_projectId_projects_id_fk',
  'stages_stageTypeCode_stage_types_code_fk',
  'work_payments_stageId_stages_id_fk',
  'work_payments_createdByUserId_users_id_fk',
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
      const triggers = await temporaryPool.query<{ name: string }>(
        'select tgname as name from pg_trigger where not tgisinternal order by tgname',
      );
      const enumTypes = await temporaryPool.query<{ name: string }>(
        "select typname as name from pg_type where typtype = 'e' and typnamespace = 'public'::regnamespace order by typname",
      );
      const roles = await temporaryPool.query<{ role: string }>(
        `select value.enumlabel as role from pg_enum value
         join pg_type type on type.oid = value.enumtypid
         where type.typname = 'user_role' order by value.enumsortorder`,
      );
      const stageTypes = await temporaryPool.query<{ code: string; title: string; position: number }>(
        'select code, title, position from stage_types order by position',
      );
      const templateItemCounts = await temporaryPool.query<{ code: string; count: number }>(`
        select stage_type."code", count(item."id")::int as count
        from stage_types stage_type
        join checklist_templates template on template."stageTypeCode" = stage_type."code" and template."isActive"
        join checklist_template_items item on item."checklistTemplateId" = template."id"
        group by stage_type."code", stage_type."position"
        order by stage_type."position"
      `);
      const project = await temporaryPool.query<{ id: number }>(`
        insert into projects (
          "ownerName", "address", "latitude", "longitude", "plannedStartDate", "plannedEndDate"
        ) values ('Клиент', 'Тестовый адрес', 56.84, 60.61, '2026-01-01', '2026-12-31')
        returning id
      `);
      const projectId = project.rows[0]?.id;
      await temporaryPool.query(`update stage_types set "isActive" = false where code = 'foundation'`);
      await expect(
        temporaryPool.query(
          `insert into stages ("projectId", "stageTypeCode", position, "plannedStartDate", "plannedEndDate")
           values ($1, 'foundation', 1, '2026-01-01', '2026-01-31')`,
          [projectId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await temporaryPool.query(`update stage_types set "isActive" = true where code = 'foundation'`);
      await temporaryPool.query(
        `insert into stages ("projectId", "stageTypeCode", position, "plannedStartDate", "plannedEndDate")
         values ($1, 'foundation', 1, '2026-01-01', '2026-01-31')`,
        [projectId],
      );
      await temporaryPool.query(`update stage_types set "isActive" = false where code = 'foundation'`);
      const retainedInactiveStage = await temporaryPool.query<{ count: number }>(
        `select count(*)::int as count from stages where "projectId" = $1 and "stageTypeCode" = 'foundation'`,
        [projectId],
      );
      expect(retainedInactiveStage.rows[0]?.count).toBe(1);
      await expect(
        temporaryPool.query(
          `insert into stages ("projectId", "stageTypeCode", position, "plannedStartDate", "plannedEndDate")
           values ($1, 'walls', 2, '2025-12-31', '2026-01-31')`,
          [projectId],
        ),
      ).rejects.toMatchObject({ code: '23514' });
      await expect(
        temporaryPool.query(
          `insert into stages (
             "projectId", "stageTypeCode", position, "plannedStartDate", "plannedEndDate", "plannedWorkAmountMinor"
           ) values ($1, 'walls', 2, '2026-02-01', '2026-02-28', -100)`,
          [projectId],
        ),
      ).rejects.toMatchObject({ code: '23514' });

      await expect(
        temporaryPool.query(`update projects set "plannedStartDate" = '2026-01-02' where id = $1`, [projectId]),
      ).rejects.toMatchObject({ code: '23514' });
      const recipientColumn = await temporaryPool.query<{ is_nullable: string }>(
        `select is_nullable from information_schema.columns
         where table_schema = 'public' and table_name = 'work_payments' and column_name = 'recipientId'`,
      );
      expect(recipientColumn.rows).toEqual([{ is_nullable: 'NO' }]);
      expect(firstJournal.rows[0]?.count).toBe('1');
      expect(secondJournal.rows).toEqual(firstJournal.rows);
      expect(firstTables.rows.map((row) => row.name)).toEqual(expectedTables);
      expect(secondTables.rows).toEqual(firstTables.rows);
      expect(indexes.rows.map((row) => row.name)).toEqual(expect.arrayContaining(expectedIndexes));
      expect(foreignKeys.rows.map((row) => row.name)).toEqual(expect.arrayContaining(expectedForeignKeys));
      expect(checkConstraints.rows[0]?.count).toBe('63');
      expect(triggers.rows.map((row) => row.name)).toEqual([
        'projects_stage_dates_trigger',
        'stages_active_type_trigger',
        'stages_project_dates_trigger',
      ]);
      expect(enumTypes.rows.map((row) => row.name)).toEqual([
        'acceptance_decision',
        'file_purpose',
        'file_status',
        'stage_status',
        'user_role',
      ]);
      expect(roles.rows.map((row) => row.role)).toEqual(['manager', 'foreman']);
      expect(stageTypes.rows).toEqual([
        { code: 'foundation', title: 'Фундамент', position: 1 },
        { code: 'walls', title: 'Стены', position: 2 },
        { code: 'roof', title: 'Крыша', position: 3 },
        { code: 'windows', title: 'Окна, двери', position: 4 },
        { code: 'facade', title: 'Фасад', position: 5 },
        { code: 'electrical', title: 'Электрика', position: 6 },
        { code: 'finishing', title: 'Штукатурка', position: 7 },
        { code: 'heating', title: 'Отопление', position: 8 },
      ]);
      expect(templateItemCounts.rows.map(({ code, count }) => [code, count])).toEqual([
        ['foundation', 5],
        ['walls', 6],
        ['roof', 8],
        ['windows', 3],
        ['facade', 4],
        ['electrical', 3],
        ['finishing', 3],
        ['heating', 2],
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
