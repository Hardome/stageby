import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { stageTypes } from './stage-types.ts';
import { stages } from './stages.ts';
import { users } from './users.ts';

export const checklistTemplates = pgTable(
  'checklist_templates',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stageTypeCode: varchar({ length: 50 })
      .notNull()
      .references(() => stageTypes.code, { onDelete: 'restrict' }),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('checklist_templates_active_stage_type_unique').on(table.stageTypeCode).where(sql`${table.isActive}`),
  ],
);

export const checklistTemplateItems = pgTable(
  'checklist_template_items',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    checklistTemplateId: integer()
      .notNull()
      .references(() => checklistTemplates.id, { onDelete: 'cascade' }),
    title: varchar({ length: 500 }).notNull(),
    photoHint: varchar({ length: 1000 }),
    position: integer().notNull(),
  },
  (table) => [
    uniqueIndex('checklist_template_items_template_position_unique').on(table.checklistTemplateId, table.position),
    check('checklist_template_items_title_not_blank_check', sql`btrim(${table.title}) <> ''`),
    check(
      'checklist_template_items_photo_hint_not_blank_check',
      sql`${table.photoHint} is null or btrim(${table.photoHint}) <> ''`,
    ),
    check('checklist_template_items_position_check', sql`${table.position} > 0`),
  ],
);

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
    photoHint: varchar({ length: 1000 }),
    position: integer().notNull(),
    isCompleted: boolean().notNull().default(false),
    requiresRework: boolean().notNull().default(false),
    completedAt: timestamp({ withTimezone: true }),
    completedByUserId: integer().references(() => users.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('checklist_items_checklist_position_unique').on(table.checklistId, table.position),
    index('checklist_items_completed_by_user_idx').on(table.completedByUserId),
    check('checklist_items_title_not_blank_check', sql`btrim(${table.title}) <> ''`),
    check('checklist_items_position_check', sql`${table.position} > 0`),
    check(
      'checklist_items_photo_hint_not_blank_check',
      sql`${table.photoHint} is null or btrim(${table.photoHint}) <> ''`,
    ),
    check(
      'checklist_items_completion_metadata_check',
      sql`(${table.isCompleted} and ${table.completedAt} is not null and ${table.completedByUserId} is not null) or (not ${table.isCompleted} and ${table.completedAt} is null and ${table.completedByUserId} is null)`,
    ),
  ],
);

export type ChecklistRow = typeof checklists.$inferSelect;
export type ChecklistItemRow = typeof checklistItems.$inferSelect;
export type ChecklistTemplateRow = typeof checklistTemplates.$inferSelect;
export type ChecklistTemplateItemRow = typeof checklistTemplateItems.$inferSelect;
