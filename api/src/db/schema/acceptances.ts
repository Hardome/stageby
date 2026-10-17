import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgEnum, pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';

import { checklistItems } from './checklists.ts';
import { stages } from './stages.ts';
import { users } from './users.ts';

export const acceptanceDecisionEnum = pgEnum('acceptance_decision', ['accepted', 'rejected']);

export const acceptances = pgTable(
  'acceptances',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stageId: integer()
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    decision: acceptanceDecisionEnum().notNull(),
    comment: varchar({ length: 5000 }),
    correctionDueDate: date(),
    decidedByUserId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    decidedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('acceptances_stage_decided_at_idx').on(table.stageId, table.decidedAt),
    index('acceptances_decided_by_user_idx').on(table.decidedByUserId),
    check('acceptances_comment_not_blank_check', sql`${table.comment} is null or btrim(${table.comment}) <> ''`),
    check(
      'acceptances_decision_data_check',
      sql`(${table.decision} = 'accepted' and ${table.correctionDueDate} is null) or (${table.decision} = 'rejected' and ${table.correctionDueDate} is not null)`,
    ),
  ],
);

export const acceptanceItems = pgTable(
  'acceptance_items',
  {
    comment: varchar({ length: 5000 }).notNull(),
    acceptanceId: integer()
      .notNull()
      .references(() => acceptances.id, { onDelete: 'cascade' }),
    checklistItemId: integer()
      .notNull()
      .references(() => checklistItems.id, { onDelete: 'restrict' }),
  },
  (table) => [
    check('acceptance_items_comment_not_blank_check', sql`btrim(${table.comment}) <> ''`),
    primaryKey({
      name: 'acceptance_items_pk',
      columns: [table.acceptanceId, table.checklistItemId],
    }),
    index('acceptance_items_checklist_item_idx').on(table.checklistItemId),
  ],
);

export type AcceptanceRow = typeof acceptances.$inferSelect;
export type AcceptanceItemRow = typeof acceptanceItems.$inferSelect;
