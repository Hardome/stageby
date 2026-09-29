import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
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
import { stageTypes } from './stage-types.ts';
import { users } from './users.ts';

export const stageStatusEnum = pgEnum('stage_status', [
  'created',
  'assigned',
  'supplied',
  'in_progress',
  'acceptance',
  'rework',
  'completed',
  'paid',
]);

export const stages = pgTable(
  'stages',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    stageTypeCode: varchar({ length: 50 })
      .notNull()
      .references(() => stageTypes.code, { onDelete: 'restrict' }),
    position: integer().notNull(),
    canRunInParallel: boolean().notNull().default(false),
    workSubtypes: varchar({ length: 255 }).array().notNull().default(sql`'{}'::varchar[]`),
    assigneeId: integer().references(() => users.id, { onDelete: 'restrict' }),
    inspectorId: integer().references(() => users.id, { onDelete: 'restrict' }),
    status: stageStatusEnum().notNull().default('created'),
    plannedStartDate: date().notNull(),
    plannedEndDate: date().notNull(),
    plannedWorkAmountMinor: bigint({ mode: 'number' }),
    plannedMaterialAmountMinor: bigint({ mode: 'number' }),
    actualStartDate: date(),
    actualEndDate: date(),
    notes: text(),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('stages_project_type_unique').on(table.projectId, table.stageTypeCode),
    uniqueIndex('stages_project_position_unique').on(table.projectId, table.position),
    unique('stages_project_id_id_unique').on(table.projectId, table.id),
    index('stages_assignee_status_idx').on(table.assigneeId, table.status),
    index('stages_inspector_status_idx').on(table.inspectorId, table.status),
    index('stages_status_idx').on(table.status),
    check('stages_position_check', sql`${table.position} between 1 and 8`),
    check('stages_work_subtypes_count_check', sql`cardinality(${table.workSubtypes}) <= 30`),
    check('stages_work_subtypes_no_null_check', sql`array_position(${table.workSubtypes}, null) is null`),
    check('stages_planned_dates_check', sql`${table.plannedEndDate} >= ${table.plannedStartDate}`),
    check(
      'stages_planned_work_amount_check',
      sql`${table.plannedWorkAmountMinor} is null or ${table.plannedWorkAmountMinor} >= 0`,
    ),
    check(
      'stages_planned_material_amount_check',
      sql`${table.plannedMaterialAmountMinor} is null or ${table.plannedMaterialAmountMinor} >= 0`,
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
