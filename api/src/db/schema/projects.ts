import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const projects = pgTable(
  'projects',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    ownerName: varchar({ length: 255 }).notNull(),
    address: varchar({ length: 1000 }),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    cadastralNumber: varchar({ length: 100 }),
    houseDesign: varchar({ length: 255 }),
    contractLabel: varchar({ length: 255 }),
    dueDate: date(),
    notes: text(),
    isArchived: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('projects_archived_created_at_idx').on(table.isArchived, table.createdAt),
    check('projects_title_not_blank_check', sql`btrim(${table.title}) <> ''`),
    check('projects_owner_name_not_blank_check', sql`btrim(${table.ownerName}) <> ''`),
    check('projects_address_not_blank_check', sql`${table.address} is null or btrim(${table.address}) <> ''`),
    check(
      'projects_coordinates_pair_check',
      sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null)`,
    ),
    check('projects_latitude_range_check', sql`${table.latitude} is null or ${table.latitude} between -90 and 90`),
    check('projects_longitude_range_check', sql`${table.longitude} is null or ${table.longitude} between -180 and 180`),
    check(
      'projects_cadastral_number_not_blank_check',
      sql`${table.cadastralNumber} is null or btrim(${table.cadastralNumber}) <> ''`,
    ),
    check(
      'projects_house_design_not_blank_check',
      sql`${table.houseDesign} is null or btrim(${table.houseDesign}) <> ''`,
    ),
    check(
      'projects_contract_label_not_blank_check',
      sql`${table.contractLabel} is null or btrim(${table.contractLabel}) <> ''`,
    ),
    check('projects_notes_not_blank_check', sql`${table.notes} is null or btrim(${table.notes}) <> ''`),
    check('projects_notes_length_check', sql`${table.notes} is null or char_length(${table.notes}) <= 5000`),
  ],
);

export type ProjectRow = typeof projects.$inferSelect;
