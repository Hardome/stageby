import { sql } from 'drizzle-orm';
import { bigint, check, date, index, integer, pgTable, timestamp, unique } from 'drizzle-orm/pg-core';

import { stages } from './stages.ts';
import { users } from './users.ts';

export const workPlanRows = pgTable(
  'work_plan_rows',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stageId: integer()
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    amountMinor: bigint({ mode: 'number' }).notNull(),
    recipientId: integer().references(() => users.id, { onDelete: 'restrict' }),
    dueDate: date(),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('work_plan_rows_stage_id_id_unique').on(table.stageId, table.id),
    index('work_plan_rows_stage_due_date_idx').on(table.stageId, table.dueDate),
    index('work_plan_rows_recipient_idx').on(table.recipientId),
    check('work_plan_rows_amount_check', sql`${table.amountMinor} >= 0 and ${table.amountMinor} % 100 = 0`),
    check('work_plan_rows_version_check', sql`${table.version} >= 1`),
  ],
);

export type WorkPlanRow = typeof workPlanRows.$inferSelect;
