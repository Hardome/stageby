import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { expect, it } from 'vitest';

const migrationsFolder = fileURLToPath(new URL('../src/db/migrations', import.meta.url));

it('repeating the initial migration preserves templates and individual checklists', {
  timeout: 30_000,
}, async () => {
  const databaseUrl = process.env.DATABASE_URL!;
  const databaseName = `stageby_template_migration_${randomUUID().replaceAll('-', '')}`;
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
    await temporaryPool.query(`
      with author as (
        insert into users (login, "passwordHash", "fullName", role)
        values ('template.master', 'test-hash', 'Мастер', 'foreman') returning id
      ), project as (
        insert into projects ("ownerName", address, latitude, longitude, "plannedStartDate", "plannedEndDate")
        values ('Клиент', 'Адрес', 56.84, 60.61, '2026-01-01', '2026-12-31') returning id
      ), stage as (
        insert into stages (
          "projectId", "stageTypeCode", position, "plannedStartDate", "plannedEndDate",
          "assigneeId", status, "actualStartDate", version
        )
        select project.id, 'electrical', 6, '2026-01-01', '2026-01-31', author.id, 'in_progress', '2026-01-02', 7
        from project, author returning id
      ), checklist as (
        insert into checklists ("stageId", version) select id, 4 from stage returning id
      )
      insert into checklist_items (
        "checklistId", title, "photoHint", position, "isCompleted", "completedAt", "completedByUserId"
      )
      select checklist.id, item.title, item.hint, item.position, item.done,
        case when item.done then now() end, case when item.done then author.id end
      from checklist, author,
        (values ('Индивидуальная электрика', 'Особая подсказка', 1, true),
                ('Проверка соединений', null, 2, false)) as item(title, hint, position, done)
    `);
    const initialItems = await temporaryPool.query('select * from checklist_template_items order by id');
    const initialTemplates = await temporaryPool.query<{ id: number }>(
      'select id from checklist_templates order by id',
    );
    const initialChecklist = await temporaryPool.query('select * from checklists order by id');
    const initialChecklistItems = await temporaryPool.query('select * from checklist_items order by id');
    const initialStages = await temporaryPool.query(`select to_jsonb(stages) as value from stages order by id`);

    await migrate(database, { migrationsFolder });
    await migrate(database, { migrationsFolder });

    expect((await temporaryPool.query('select * from checklists order by id')).rows).toEqual(initialChecklist.rows);
    expect((await temporaryPool.query('select * from checklist_items order by id')).rows).toEqual(
      initialChecklistItems.rows,
    );
    expect((await temporaryPool.query('select to_jsonb(stages) as value from stages order by id')).rows).toEqual(
      initialStages.rows,
    );
    expect(
      (
        await temporaryPool.query('select * from checklist_template_items where id = any($1) order by id', [
          initialItems.rows.map((item) => item.id),
        ])
      ).rows,
    ).toEqual(initialItems.rows);
    expect(
      (
        await temporaryPool.query('select "isActive" from checklist_templates where id = any($1)', [
          initialTemplates.rows.map((template) => template.id),
        ])
      ).rows,
    ).toEqual(initialTemplates.rows.map(() => ({ isActive: true })));

    const activeItems = await temporaryPool.query<{ code: string; title: string; photoHint: string | null }>(`
      select template."stageTypeCode" as code, item.title, item."photoHint"
      from checklist_templates template
      join checklist_template_items item on item."checklistTemplateId" = template.id
      where template."isActive" order by template."stageTypeCode", item.position
    `);
    expect(activeItems.rows).toHaveLength(34);
    expect(activeItems.rows.filter((item) => item.title === 'Уборка')).toHaveLength(8);
    expect(activeItems.rows.filter((item) => item.code === 'electrical')).toEqual([
      { code: 'electrical', title: 'Установка щитового оборудования', photoHint: 'Фото всех щитков' },
      { code: 'electrical', title: 'Установка распределительных коробок', photoHint: 'Фото каждой коробки' },
      { code: 'electrical', title: 'Уборка', photoHint: null },
    ]);
    const activeTemplates = await temporaryPool.query('select id from checklist_templates where "isActive"');
    expect(activeTemplates.rows).toHaveLength(8);
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
