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
    ownerName: varchar({ length: 255 }).notNull(),
    address: varchar({ length: 1000 }).notNull(),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    cadastralNumber: varchar({ length: 100 }),
    houseDesign: varchar({ length: 255 }),
    contractLabel: varchar({ length: 255 }),
    plannedStartDate: date().notNull(),
    plannedEndDate: date().notNull(),
    documentFileIds: integer().array().notNull().default(sql`'{}'::integer[]`),
    notes: text(),
    isArchived: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('projects_archived_created_at_idx').on(table.isArchived, table.createdAt),
    check('projects_owner_name_not_blank_check', sql`btrim(${table.ownerName}) <> ''`),
    check('projects_address_not_blank_check', sql`btrim(${table.address}) <> ''`),
    check('projects_latitude_range_check', sql`${table.latitude} between -90 and 90`),
    check('projects_longitude_range_check', sql`${table.longitude} between -180 and 180`),
    check('projects_planned_dates_check', sql`${table.plannedEndDate} >= ${table.plannedStartDate}`),
    check('projects_document_file_ids_positive_check', sql`0 < all(${table.documentFileIds})`),
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
