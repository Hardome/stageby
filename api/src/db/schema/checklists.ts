import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { stages } from './stages.ts';
import { users } from './users.ts';

export const checklists = pgTable(
  'checklists',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stageId: integer()
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('checklists_stage_id_unique').on(table.stageId),
    check('checklists_version_check', sql`${table.version} >= 1`),
  ],
);

export const checklistItems = pgTable(
  'checklist_items',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    checklistId: integer()
      .notNull()
      .references(() => checklists.id, { onDelete: 'cascade' }),
    title: varchar({ length: 500 }).notNull(),
    position: integer().notNull(),
    isCompleted: boolean().notNull().default(false),
    completedAt: timestamp({ withTimezone: true }),
    completedByUserId: integer().references(() => users.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('checklist_items_checklist_position_unique').on(table.checklistId, table.position),
    index('checklist_items_completed_by_user_idx').on(table.completedByUserId),
    check('checklist_items_title_not_blank_check', sql`btrim(${table.title}) <> ''`),
    check('checklist_items_position_check', sql`${table.position} between 1 and 4`),
    check(
      'checklist_items_completion_metadata_check',
      sql`(${table.isCompleted} and ${table.completedAt} is not null and ${table.completedByUserId} is not null) or (not ${table.isCompleted} and ${table.completedAt} is null and ${table.completedByUserId} is null)`,
    ),
  ],
);

export type ChecklistRow = typeof checklists.$inferSelect;
export type ChecklistItemRow = typeof checklistItems.$inferSelect;
