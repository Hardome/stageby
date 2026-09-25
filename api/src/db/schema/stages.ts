import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.ts';
import { users } from './users.ts';

export const stageTypeEnum = pgEnum('stage_type', [
  'foundation',
  'walls',
  'roof',
  'windows',
  'facade',
  'electrical',
  'plaster',
  'heating',
]);

export const stageStatusEnum = pgEnum('stage_status', [
  'created',
  'assigned',
  'supplied',
  'started',
  'in_progress',
  'acceptance',
  'completed',
]);

export const stages = pgTable(
  'stages',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: stageTypeEnum().notNull(),
    position: integer().notNull(),
    workSubtypes: varchar({ length: 255 }).array().notNull().default(sql`'{}'::varchar[]`),
    assigneeId: integer().references(() => users.id, { onDelete: 'restrict' }),
    inspectorId: integer().references(() => users.id, { onDelete: 'restrict' }),
    status: stageStatusEnum().notNull().default('created'),
    plannedStartDate: date(),
    plannedEndDate: date(),
    actualStartDate: date(),
    actualEndDate: date(),
    notes: text(),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('stages_project_type_unique').on(table.projectId, table.type),
    uniqueIndex('stages_project_position_unique').on(table.projectId, table.position),
    unique('stages_project_id_id_unique').on(table.projectId, table.id),
    index('stages_assignee_status_idx').on(table.assigneeId, table.status),
    index('stages_inspector_status_idx').on(table.inspectorId, table.status),
    index('stages_status_idx').on(table.status),
    check('stages_position_check', sql`${table.position} between 1 and 8`),
    check(
      'stages_type_position_check',
      sql`(${table.type}, ${table.position}) in (('foundation', 1), ('walls', 2), ('roof', 3), ('windows', 4), ('facade', 5), ('electrical', 6), ('plaster', 7), ('heating', 8))`,
    ),
    check('stages_work_subtypes_count_check', sql`cardinality(${table.workSubtypes}) <= 30`),
    check('stages_work_subtypes_no_null_check', sql`array_position(${table.workSubtypes}, null) is null`),
    check(
      'stages_planned_dates_check',
      sql`${table.plannedStartDate} is null or ${table.plannedEndDate} is null or ${table.plannedEndDate} >= ${table.plannedStartDate}`,
    ),
    check('stages_notes_not_blank_check', sql`${table.notes} is null or btrim(${table.notes}) <> ''`),
    check('stages_notes_length_check', sql`${table.notes} is null or char_length(${table.notes}) <= 5000`),
    check('stages_version_check', sql`${table.version} >= 1`),
  ],
);

export const stagePredecessors = pgTable(
  'stage_predecessors',
  {
    projectId: integer().notNull(),
    stageId: integer().notNull(),
    predecessorStageId: integer().notNull(),
  },
  (table) => [
    primaryKey({
      name: 'stage_predecessors_pk',
      columns: [table.projectId, table.stageId, table.predecessorStageId],
    }),
    foreignKey({
      name: 'stage_predecessors_stage_fk',
      columns: [table.projectId, table.stageId],
      foreignColumns: [stages.projectId, stages.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'stage_predecessors_predecessor_fk',
      columns: [table.projectId, table.predecessorStageId],
      foreignColumns: [stages.projectId, stages.id],
    }).onDelete('cascade'),
    index('stage_predecessors_predecessor_idx').on(table.predecessorStageId),
    check('stage_predecessors_not_self_check', sql`${table.stageId} <> ${table.predecessorStageId}`),
  ],
);

export type StageRow = typeof stages.$inferSelect;
export type StagePredecessorRow = typeof stagePredecessors.$inferSelect;
