import { sql } from 'drizzle-orm';
import { bigint, check, date, foreignKey, index, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import { stages } from './stages.ts';
import { users } from './users.ts';
import { workPlanRows } from './work-plan-rows.ts';

export const workPayments = pgTable(
  'work_payments',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stageId: integer()
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    workPlanRowId: integer().notNull(),
    recipientId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    paidAt: date().notNull(),
    amountMinor: bigint({ mode: 'number' }).notNull(),
    comment: varchar({ length: 1000 }),
    createdByUserId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('work_payments_stage_paid_at_idx').on(table.stageId, table.paidAt),
    index('work_payments_plan_row_idx').on(table.workPlanRowId),
    foreignKey({
      name: 'work_payments_plan_row_stage_fk',
      columns: [table.stageId, table.workPlanRowId],
      foreignColumns: [workPlanRows.stageId, workPlanRows.id],
    }).onDelete('restrict'),
    check('work_payments_amount_check', sql`${table.amountMinor} > 0`),
    check('work_payments_comment_not_blank_check', sql`${table.comment} is null or btrim(${table.comment}) <> ''`),
    check('work_payments_version_check', sql`${table.version} >= 1`),
  ],
);

export type WorkPaymentRow = typeof workPayments.$inferSelect;
