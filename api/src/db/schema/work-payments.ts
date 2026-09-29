import { sql } from 'drizzle-orm';
import { bigint, check, index, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';

import { stages } from './stages.ts';

export const workPayments = pgTable(
  'work_payments',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stageId: integer()
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    amountMinor: bigint({ mode: 'number' }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('work_payments_stage_idx').on(table.stageId),
    check('work_payments_amount_check', sql`${table.amountMinor} > 0`),
  ],
);

export type WorkPaymentRow = typeof workPayments.$inferSelect;
