import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const stageTypes = pgTable(
  'stage_types',
  {
    code: varchar({ length: 50 }).primaryKey(),
    title: varchar({ length: 255 }).notNull(),
    position: integer().notNull(),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('stage_types_position_unique').on(table.position),
    check('stage_types_code_not_blank_check', sql`btrim(${table.code}) <> ''`),
    check('stage_types_title_not_blank_check', sql`btrim(${table.title}) <> ''`),
    check('stage_types_position_check', sql`${table.position} > 0`),
  ],
);

export type StageTypeRow = typeof stageTypes.$inferSelect;
