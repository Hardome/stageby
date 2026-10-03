import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    operation: text().notNull(),
    source: text({ enum: ['api', 'command', 'system'] }).notNull(),
    requestId: text(),
    actorUserId: integer(),
    actorSnapshot: jsonb().$type<{ fullName: string; login: string; role: string }>(),
    formatVersion: integer().notNull().default(1),
  },
  (table) => [
    index('audit_events_occurred_at_idx').on(table.occurredAt, table.id),
    check('audit_events_source_check', sql`${table.source} in ('api', 'command', 'system')`),
  ],
);

export const auditChanges = pgTable(
  'audit_changes',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    eventId: integer()
      .notNull()
      .references(() => auditEvents.id, { onDelete: 'restrict' }),
    entityType: text().notNull(),
    entityKey: jsonb().$type<Record<string, unknown>>().notNull(),
    projectId: integer(),
    stageId: integer(),
    action: text({ enum: ['create', 'update', 'delete'] }).notNull(),
    before: jsonb().$type<Record<string, unknown>>(),
    after: jsonb().$type<Record<string, unknown>>(),
  },
  (table) => [
    index('audit_changes_event_idx').on(table.eventId),
    index('audit_changes_entity_idx').on(table.entityType, table.entityKey),
    index('audit_changes_project_idx').on(table.projectId, table.eventId),
    index('audit_changes_stage_idx').on(table.stageId, table.eventId),
    check('audit_changes_action_check', sql`${table.action} in ('create', 'update', 'delete')`),
    check(
      'audit_changes_snapshots_check',
      sql`(${table.action} = 'create' and ${table.before} is null and ${table.after} is not null) or (${table.action} = 'update' and ${table.before} is not null and ${table.after} is not null) or (${table.action} = 'delete' and ${table.before} is not null and ${table.after} is null)`,
    ),
  ],
);
